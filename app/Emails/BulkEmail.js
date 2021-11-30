'use strict';

//Repositories
// const SendgridConfigurationRepository = new (use('App/Helpers/SendgridConfigurationRepository'))();
const BulkEmailOptOutRepository = new (use('App/Helpers/BulkEmailOptOutRepository'))();
const EmailRepository = new (use('App/Helpers/EmailRepository'))();
const CandidateRepository = new (use('App/Helpers/CandidateRepository'))();
const HiringAuthorityRepository = new (use('App/Helpers/HiringAuthorityRepository'))();
const NameRepository = new (use('App/Helpers/NameRepository'))();
const Services = new (use('App/Helpers/Services'))();

//Utils
const ModulePresetsConfigRepository = new (use('App/Helpers/ModulePresetsConfigRepository'))();
const appInsights = require('applicationinsights');
const Drive = use('Drive');
const Mime = require('mime-types');
const Hash = use('Hash');
const moment = use('moment');
const {
  SearchProjectTypes,
  SendgridSuppressionGroups,
  SendgridEventTypes,
  BulkEmailScopeTypes,
  Smartags,
  SmartagTypes,
  Regex,
  SendgridValidStatusCode,
  BulkEmailSendgridCategory,
  BriteVerifyVerdicts,
} = use('App/Helpers/Globals');
const { chunk, uniqBy, uniqWith } = use('lodash');
const Env = use('Env');
const _toLowerCase = (string = '') => {
  return string ? string.toLowerCase() : '';
};

//Constants
const SendgridRecipientsLimit = 950;
const UnsubscribeFooter = `<br><table width="100%" style="table-layout: fixed;">
  <tbody>
    <tr>
      <td style="padding:60px 0px 0px 0px; line-height:22px; text-align:inherit;" height="100%" valign="top">
        <div style="font-family: inherit; text-align: center">You're receiving this email as part of a recruitment campaign focused on your industry. If you no longer wish to receive our emails, <a href="<%asm_preferences_raw_url%>" >you can unsubscribe here</a></div>
        <div style="text-align: center">gpac - 116 W. 69th Street Suite 200 Sioux Falls, SD 57108</div>
      </td>
    </tr>
  </tbody>
</table>`;

class BulkEmail {
  /**
   * Send a bulk email to the recipients passed, with the information & blockers provided
   *
   * @description This method does the logic of filtering the opt outs, unsubscribes, passed blocked emails; Creates the Sendgrid JSON, chunkifies when neccesary, sends the bulk & returns the information used
   *
   * @param {Object} emailData - Contains the neccesary info for creating a bulk
   * @param {String} emailData.name - Sender name
   * @param {String} emailData.email - Sender email
   * @param {String} emailData.html - Email body, in html
   * @param {String} emailData.text - Email body, in plain text, stripped of any html tags
   * @param {String} emailData.subject - Email subject
   * @param {Object[]} emailData.recipients - An array of the recipients
   * @param {String} emailData.recipients.name - Recipient name
   * @param {String} emailData.recipients.email - Recipient email
   *
   * @param {Object[]} rawAttachments - The object Attachments, in it usually passed from the bulk itself, using with('Attachments')
   * @param {Number} emailHistoryId - The bulk email id, or the email history id, the backbone of the bulk
   * @param {Number} bulkEmailScopeTypeId - What scope this email is expected to be, usually is 1 or 2, marketing or recruiting
   *
   * @param {Number[]} candidateIds - An array of candidates that the bulk intends to market (paired with bulk type marketing)
   * @param {Number} userId - Who is sending the bulk email - !!CAREFUL!! - If for whatever reason it was Scheduled, Validated by a coach, etc. CHECK THAT THIS USER ID IS THE RECRUITER WHO INTENDED TO SEND THE BULK!!!!!
   *
   * @param {Object} config - An object containing bulk configurations
   * @param {Boolean} config.blockSimilarCompanies - Allows the marketing bulk to search HA employers with companies that have the name alike
   * @param {Boolean} config.blockClientCompanies - Allows the marketing bulk to remove any hiring authorities that belong to a signed/client company
   *
   * @param {Object} blockedByResendItems - An object containing the information of the emails that should be blocked, obtained by the block resend option
   * @param {Number[]} blockedByResendItems.candidateIds - An array of the candidate ids that should be blocked off from sending
   * @param {Number[]} blockedByResendItems.haIds - An array of the hiring authorities ids that should be blocked off from sending
   * @param {Number[]} blockedByResendItems.nameIds - An array of the name ids that should be blocked off from sending
   *
   * @return {Object} if successful, returns the blocked emails, invalid emails, recipients, sendgrid response & the bulkBatchId, else a classic error message
   */
  async send(
    emailData,
    rawAttachments,
    emailHistoryId = null,
    bulkEmailScopeTypeId = -1,
    candidateIds,
    userId,
    config = {},
    blockedByResendItems = null
  ) {
    try {
      emailData.recipients = this.recipientsToLowerCase(emailData.recipients);

      const blockedEmails = await this.getBlockedEmails(emailData, bulkEmailScopeTypeId, candidateIds, config);
      if (blockedEmails === false) throw `Could not get blocked emails`;

      const invalidEmails = await this.getInvalidEmails(emailData, blockedByResendItems);
      if (invalidEmails === false) throw `Could not get invalid emails`;

      const recipientsWithOutSmartags = this.getRecipientsMinusBlocked(emailData, blockedEmails, invalidEmails);

      const recipients = await this.addSmartagsToRecipients(recipientsWithOutSmartags, userId);
      if (recipients.success === false) return recipients;

      const attachments = await this.getAttachments(rawAttachments);

      const personalizations = this.buildEmailPersonalizations(recipients, emailHistoryId);

      const sendgridJSON = await this.buildBulkSendgridJSON(personalizations, emailData, attachments);

      //Add the unsubscribe footer!
      const footer = await this.getUnsubscribeFooter();
      sendgridJSON.html = `${sendgridJSON.html} ${footer}`;

      if (sendgridJSON.personalizations.length === 0) {
        return {
          success: false,
          data: { blockedEmails, invalidEmails },
          message: `It seems that all your recipients were blocked and/or invalid`,
          code: 400,
        };
      }

      const { response, sentRecipients, failedRecipients } = await this.sendBulk(sendgridJSON);

      const invalidEmailsWithFailedRecipients = this.addFailedRecipientsToInvalidEmails(
        invalidEmails,
        failedRecipients
      );

      return {
        blockedEmails,
        invalidEmails: invalidEmailsWithFailedRecipients,
        recipients,
        response,
        sentRecipients,
        failedRecipients,
        bulkBatchId: sendgridJSON.customArgs.bulkBatchId,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      if (error.response) {
        // Extract error msg
        const { message, code, response } = error;

        // Extract response msg
        const { body } = response;

        appInsights.defaultClient.trackException({ exception: body });

        return {
          success: false,
          statusCode: code ? code : 500,
          message: message ? message : 'Could not send the email due to an error in the Sendgrid service',
        };
      }

      return {
        success: false,
        statusCode: 500,
        message: 'Could not send the email due to an error in the Sendgrid service',
      };
    }
  }

  addFailedRecipientsToInvalidEmails(invalidEmails, failedRecipients) {
    const formatedInvalidEmails = failedRecipients.map((recipient) => {
      return { ...recipient, created_at: moment().format(), type: SendgridEventTypes.failedrecipient };
    });

    return [...invalidEmails, ...formatedInvalidEmails];
  }

  recipientsToLowerCase(recipients) {
    return recipients.map((recipient) => {
      return { ...recipient, email: _toLowerCase(recipient.email) };
    });
  }

  async sendBulk(sendgridJSON) {
    const SendgridService = use('Services/Sendgrid'); //Move here due to the unit tests not being to fake the service, since it is initialized before the fake could do anything

    const chunkedPersonalizations = chunk(sendgridJSON.personalizations, SendgridRecipientsLimit);

    const sentRecipients = [];
    const failedRecipients = [];
    let response = { statusCode: 0 };
    let sendgridAcceptedTheBulk = false;
    for (const chunkedPersonalization of chunkedPersonalizations) {
      const recipientData = chunkedPersonalization.map((personalization) => personalization.recipientData);

      try {
        sendgridJSON.personalizations = chunkedPersonalization;

        for (const personalization of sendgridJSON.personalizations) {
          delete personalization.recipientData;
        }

        let trySendingRequestAgain = true;
        let maxTries = 3;

        while (trySendingRequestAgain && maxTries > 0) {
          response = (await SendgridService.sendBulkEmailToUsers(sendgridJSON))[0];
          sendgridAcceptedTheBulk = response.statusCode && Number(response.statusCode) === SendgridValidStatusCode;

          if (sendgridAcceptedTheBulk) {
            trySendingRequestAgain = false;
          } else {
            await this.sleep(Math.round(Math.random() * 1000)); //Sendgrid has a rate limit of 10,000 petitions per second, but due to good practices a mini loop here is created
          }

          maxTries--;
        }

        if (sendgridAcceptedTheBulk) {
          sentRecipients.push(...recipientData);
        } else {
          failedRecipients.push(...recipientData);
        }

        await this.sleep(1000);
      } catch (error) {
        failedRecipients.push(...recipientData);
        await this.sleep(1000);
      }
    }

    return { response, sentRecipients, failedRecipients };
  }

  sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  /**
   *  Adds the substitution (smartags) field to the recipients, all recipients must have their smartags in order
   *
   * @summary The smartags allows the users to have their own custom information in the bulk email, since candidates, hirings & names have differents methods of obtaining their information, each one have their logic inside this method
   *
   * @param {Object[]} recipientsWithOutSmartags - The recipients, usually their id & item type is enought, other that the required in the rest of the flow
   * @param {Number} userId - Who is sending the bulk email, must be the intended sender since the Smartags will come from him/her
   *
   * @return {Object[]} recipientsWithSmartags
   */
  async addSmartagsToRecipients(recipientsWithOutSmartags, userId) {
    const candidateIds = [];
    const haIds = [];
    const nameIds = [];

    for (const recipient of recipientsWithOutSmartags) {
      switch (Number(recipient.item_search_project_type)) {
        case SearchProjectTypes.Candidate:
          candidateIds.push(recipient.id);
          break;

        case SearchProjectTypes.HiringAuthority:
          haIds.push(recipient.id);
          break;

        case SearchProjectTypes.Name:
        case SearchProjectTypes.NameCandidate:
        case SearchProjectTypes.NameHA:
          nameIds.push(recipient.id);
          break;
      }
    }

    const candidateSmartags = await EmailRepository.getCandidatesSmartags(candidateIds);
    const haSmartags = await EmailRepository.getHiringAuthoritiesSmartags(haIds);
    const nameSmartags = await EmailRepository.getNamesSmartags(nameIds);

    const senderSmartags = await EmailRepository.getSenderSmartags(userId);
    const validatedSenderSmartags = this.validateSmartags(senderSmartags, SmartagTypes.sender);
    if (!validatedSenderSmartags.success) {
      return validatedSenderSmartags;
    }

    for (const recipient of recipientsWithOutSmartags) {
      const itemFindValidation = ({ id }) => id == recipient.id;

      let foundSmartags = null;

      switch (Number(recipient.item_search_project_type)) {
        case SearchProjectTypes.Candidate:
          foundSmartags = candidateSmartags.find(itemFindValidation);
          break;

        case SearchProjectTypes.HiringAuthority:
          foundSmartags = haSmartags.find(itemFindValidation);
          break;

        case SearchProjectTypes.Name:
        case SearchProjectTypes.NameCandidate:
        case SearchProjectTypes.NameHA:
          foundSmartags = nameSmartags.find(itemFindValidation);
          break;

        default:
          throw `There was a user that didn't have a substitution, please check it out, id: ${recipient.id}, type: ${recipient.item_search_project_type}. Object: ${recipient}`;
      }

      if (!foundSmartags) {
        return {
          success: false,
          message: `We could not get the Smartags for the item ${recipient.email}`,
          code: 409,
        };
      }

      const smartagValidation = this.validateSmartags(foundSmartags);
      if (!smartagValidation.success) {
        return smartagValidation;
      }

      const substitutions = {};
      for (const { value: smartag, type } of Smartags) {
        switch (type) {
          case SmartagTypes.recipient: //Items Smartags, recipients
            substitutions[smartag] = foundSmartags[smartag];
            break;

          case SmartagTypes.sender: //Recruiter Smartags, sender
            substitutions[smartag] = senderSmartags[smartag];
            break;

          default:
            throw `We found a Smartag without a valid Type?: ${type}`;
        }
      }

      recipient.substitutions = substitutions;
    }

    return recipientsWithOutSmartags;
  }

  validateSmartags(unvalidatedSmartags, typeToValidate = SmartagTypes.recipient) {
    const smartagsNotfound = [];
    const smartagNotValid = (smartag) => smartag === null || smartag === undefined; //'' is valid, since some fields can be empty, but undefined means that the query didn't even try to get it

    for (const { value: smartag, type } of Smartags) {
      if (smartagNotValid(unvalidatedSmartags[smartag]) && type === typeToValidate) smartagsNotfound.push(smartag);
    }

    if (smartagsNotfound.length > 0) {
      return {
        success: false,
        message: `We could not get all the Smartags: ${smartagsNotfound.toString()}`,
        code: 400,
      };
    }

    return {
      success: true,
    };
  }

  buildEmailPersonalizations(recipients, emailHistoryId) {
    const unsubscribeWebsite = 'https://gpac-public-portal/bulk-unsubscribe'; //Placeholder

    return recipients.map((recipient) => {
      const unsubscribe_url =
        emailHistoryId !== null
          ? `${unsubscribeWebsite}?email=${recipient.email}&reference=${emailHistoryId}`
          : `${unsubscribeWebsite}?email=${recipient.email}`;
      return {
        recipientData: recipient,
        to: recipient.email,
        substitutions: {
          ...recipient.substitutions,
          unsubscribe_url,
        },
      };
    });
  }

  async getAttachments(rawAttachments) {
    try {
      const attachments = [];
      for (const rawAttachment of rawAttachments) {
        const pathFile = rawAttachment.url.split('/files/');

        if (pathFile.length <= 0) continue;

        const path = pathFile[1];

        const decodedPath = decodeURIComponent(path);

        if (await Drive.disk('azure').exists(decodedPath)) {
          const stream = (await Drive.disk('azure').getStream(decodedPath)).readableStreamBody;
          stream.setEncoding('base64');

          const base64String = await this.streamToString(stream);

          attachments.push({
            content: base64String,
            filename: rawAttachment.name,
            type: this.getMIMEType(rawAttachment.name),
            disposition: 'attachment',
          });
        }
      }

      return attachments;
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  }

  async streamToString(stream) {
    let string = '';
    for await (const chunk of stream) {
      string += chunk;
    }
    return string;
  }

  getMIMEType(filename) {
    //Sendgrid & emails providers in general does not like application/octet-stream, so gotta be careful with that
    return Mime.lookup(filename) || 'application/octet-stream';
  }

  getRecipientsIdsAndEmails(recipients) {
    const candidateIds = [];
    const haIds = [];
    const nameIds = [];
    const itemEmails = [];

    for (const recipient of recipients) {
      switch (Number(recipient.item_search_project_type)) {
        case SearchProjectTypes.Candidate:
          candidateIds.push(recipient.id);
          break;

        case SearchProjectTypes.HiringAuthority:
          haIds.push(recipient.id);
          break;

        case SearchProjectTypes.Name:
        case SearchProjectTypes.NameCandidate:
        case SearchProjectTypes.NameHA:
          nameIds.push(recipient.id);
          break;
      }

      itemEmails.push(recipient.email);
    }

    return {
      itemIds: { candidateIds, haIds, nameIds },
      itemEmails,
    };
  }

  /**
   * Returns the emails that are blocked in our recipient array. Blocked emails contains opt outs, unsubscribes, hiring authorities via recruiting scope & whole company email when marketing scope
   *
   * @param {Object} emailData.recipients - The recipients the bulk email will be sent to
   * @param {Number} bulkEmailScopeTypeId - The scope that will determinate what emails will be filtered
   * @param {Number} candidateIds - The scope that will determinate what emails will be filtered,
   * @param {Object} config - An object containing bulk configurations
   *
   * @summary This method returns the intersection between the recipients & the emails deemed blocked. @method getInvalidEmails works similar, but an invalid email is mostly an address itself that is bad, not the recipient as an entity itself
   *
   * @return {Array}
   */
  async getBlockedEmails({ recipients }, bulkEmailScopeTypeId, candidateIds, config) {
    try {
      const isHiringAuthority = (type) => {
        return type === SearchProjectTypes.HiringAuthority || type === SearchProjectTypes.NameHA;
      };
      const isCandidate = (type) => {
        return (
          type === SearchProjectTypes.Candidate ||
          type === SearchProjectTypes.NameCandidate ||
          type === SearchProjectTypes.Name
        );
      };

      const { itemIds, itemEmails } = await this.getRecipientsIdsAndEmails(recipients);

      const result = await BulkEmailOptOutRepository.getOptOutEmailsByIdsAndEmails(itemIds, itemEmails);
      if (result.code !== 200) throw result;
      const blockedEmails = result.data;

      const blockedEmailsIntersection = recipients.flatMap((recipient) => {
        const foundBlocked = blockedEmails.find((row) => _toLowerCase(row.email) === _toLowerCase(recipient.email));
        if (foundBlocked) return { ...recipient, created_at: moment().format(), type: foundBlocked.type };

        return [];
      });

      switch (Number(bulkEmailScopeTypeId)) {
        case BulkEmailScopeTypes.Marketing: {
          //Marketing emails should not be send to the hiring authorities of candidate's Company, that are being market-ed
          const clientEmails = await BulkEmailOptOutRepository.getCompanyClientHiringAuthoritiesEmails(candidateIds);

          const clientEmailsIntersection = await this.getBlockedByScopeEmails(
            clientEmails,
            isCandidate, //Remove candidate, marketing emails should be send only to hirin authorities
            recipients,
            blockedEmails,
            SendgridEventTypes.marketing
          );

          blockedEmailsIntersection.push(...clientEmailsIntersection);

          if (config.blockSimilarCompanies) {
            //Hirings from companies that have a preeetty similar name... yeah
            const similarClientEmails = await BulkEmailOptOutRepository.getSimilarCompanyClientHAEmails(candidateIds);

            const similarClientEmailsIntersection = await this.getBlockedByScopeEmails(
              similarClientEmails,
              null,
              recipients,
              blockedEmails,
              SendgridEventTypes.similarmarketing
            );

            blockedEmailsIntersection.push(...similarClientEmailsIntersection);
          }

          if (config.blockClientCompanies) {
            const clientSignedHiringAuthorities = await BulkEmailOptOutRepository.getClientSignedHiringAuthorities();

            const clientSignedHAIntersection = await this.getBlockedByScopeEmails(
              clientSignedHiringAuthorities,
              null,
              recipients,
              blockedEmails,
              SendgridEventTypes.clientsignedcompanymarketing
            );

            blockedEmailsIntersection.push(...clientSignedHAIntersection);
          }
          break;
        }

        case BulkEmailScopeTypes.Recruiting: {
          //Recruiting emails should not be sent to the employees of OUR client/vendors companies
          const clientEmails = await BulkEmailOptOutRepository.getCompanyClientEmployeesEmails();

          const clientEmailsIntersection = await this.getBlockedByScopeEmails(
            clientEmails,
            isHiringAuthority, //Remove Hirings, recruiting emails should be only send to candidates & names
            recipients,
            blockedEmails,
            SendgridEventTypes.recruiting
          );
          blockedEmailsIntersection.push(...clientEmailsIntersection);

          const placedOrInactiveCandidates = await this.getPlacedOrInactiveCandidates(recipients, blockedEmails);
          blockedEmailsIntersection.push(...placedOrInactiveCandidates);
          break;
        }
      }
      return uniqBy(blockedEmailsIntersection, 'email');
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return false;
    }
  }

  /**
   * Helper method for the @method getBlockedEmails, improves readability & code reusability
   *
   * @param {Object[]} clientEmails - The emails that are deemed client, they deemed blocked & removed from the recipients
   * @param {Function} isEntityRemoveMethod - Removes the recipient if it does belong to ceratain entity, like candidates are removed if the email is for marketing purpose; HA removed if it's for recruiting
   * @param {Object[]} recipients - The recipients, to whom the bulk will be sent to, from here the recipients deemed blocked will be removed
   * @param {Object[]} blockedEmails - The recipients already blocked, helps to reduce any posible duplicate entry
   * @param {String} eventType - What event type will be marked as when removing a client email (usually marketing or recruiting)
   *
   * @summary This methods returns the intersection between the invalid emails & the recipients
   *
   * @returns {Object[]} clientEmailsIntersection - The intersection between the recipients & the blocked emails
   */
  async getBlockedByScopeEmails(clientEmails, isEntityRemoveMethod, recipients, blockedEmails, eventType) {
    return recipients.flatMap((recipient) => {
      const foundRepeatedBlocked = blockedEmails.find(
        (row) => _toLowerCase(row.email) === _toLowerCase(recipient.email)
      );
      if (foundRepeatedBlocked) return []; //If it is already blocked, not need to duplicate it

      const foundClient = clientEmails.find(
        (row) => _toLowerCase(row.email) === _toLowerCase(recipient.email) && row.id === recipient.id
      );
      //Removed because he is a client
      // if candidate, he belongs to a company that is vendor or client
      // if hiring, he works in the same company as the candidate
      if (foundClient) return { ...recipient, created_at: moment().format(), type: eventType };

      if (
        isEntityRemoveMethod instanceof Function &&
        isEntityRemoveMethod(Number(recipient.item_search_project_type))
      ) {
        //Removed because it does not belong to the bulk scope
        return { ...recipient, created_at: moment().format(), type: SendgridEventTypes.scope };
      }

      return [];
    });
  }

  /**
   * Returns the candidates that are placed or inactive
   *
   * @param {Object[]} recipients - The recipients, to whom the bulk will be sent to, from here the recipients deemed blocked will be removed
   * @param {Object[]} blockedEmails - The recipients already blocked, helps to reduce any posible duplicate entry
   *
   * @summary This method works a little different than the other, in an effort of speeding up the process, instead of obtaining all candidates that are placed/inactive and then doing an intersection between the recipient, instead the candidates ids are passed to the query & the DB does the intersectino logic by using a whereIn
   *
   * @returns {Object[]} clientEmailsIntersection - The intersection between the recipients & the blocked emails
   */
  async getPlacedOrInactiveCandidates(recipients, blockedEmails) {
    const candidateIds = recipients.flatMap((recipient) => {
      const foundRepeatedBlocked = blockedEmails.find(
        (row) => _toLowerCase(row.email) === _toLowerCase(recipient.email)
      );
      if (foundRepeatedBlocked) return [];

      if (Number(recipient.item_search_project_type) === SearchProjectTypes.Candidate) return recipient.id;

      return [];
    });

    const rawInvalidCandidates = await BulkEmailOptOutRepository.getPlacedOrInactiveCandidates(candidateIds);

    return recipients.flatMap((recipient) => {
      const foundClient = rawInvalidCandidates.find(
        (row) => _toLowerCase(row.email) === _toLowerCase(recipient.email) && row.id === recipient.id
      );
      if (foundClient) return { ...recipient, created_at: moment().format(), type: SendgridEventTypes.candidatestatus };

      return [];
    });
  }

  getVerdictType(verdict) {
    switch (verdict) {
      case BriteVerifyVerdicts.unknown:
        return SendgridEventTypes.emailValidation.unknown;

      case BriteVerifyVerdicts.acceptAll:
        return SendgridEventTypes.emailValidation.acceptAll;

      case BriteVerifyVerdicts.invalid:
      default:
        return SendgridEventTypes.emailValidation.invalid;
    }
  }

  isName(type = null) {
    const formatedType = Number(type);
    const nameTypes = [SearchProjectTypes.Name, SearchProjectTypes.NameCandidate, SearchProjectTypes.NameHA];

    const isTypeName = nameTypes.includes(formatedType);

    console.log('a')

    return isTypeName;
  }

  /**
   *
   * @param {Object} to
   *
   * @summary This methods returns the intersection between the invalid emails & the recipients
   *
   * @return {Array}
   */
  async getInvalidEmails({ recipients }, blockedByResendItems) {
    try {
      const { itemEmails } = await this.getRecipientsIdsAndEmails(recipients);

      //These are the invalid emails, they are taken from the sendgrid validations
      const result = await Services.getSendgridValidationEmails('invalid', itemEmails);
      if (result.code !== 200) throw result;
      const invalidEmails = result.data;

      const invalidRecipients = recipients.flatMap((recipient) => {
        const foundInvalid = invalidEmails.find((row) => _toLowerCase(row.email) === _toLowerCase(recipient.email));
        if (foundInvalid) {
          return { ...recipient, created_at: moment().format(), type: this.getVerdictType(foundInvalid.verdict) };
        }

        return [];
      });

      //This part remove any email that is null
      const nullRecipients = recipients.flatMap((recipient) => {
        const isEmailNull = !recipient.email || Regex.email.exec(recipient.email) === null;
        if (isEmailNull) return { ...recipient, created_at: moment().format(), type: SendgridEventTypes.empty };

        return [];
      });

      invalidRecipients.push(...nullRecipients);

      //This part removes candidates that do not have any company whatsoever
      const candidateIds = recipients
        .filter((item) => Number(item.item_search_project_type) === SearchProjectTypes.Candidate)
        .map((item) => item.id);
      if (candidateIds.length > 0) {
        const candidates = await CandidateRepository.getCandidatesByIds(candidateIds);

        const candidateWithoutEmployers = candidates.flatMap((candidate) => {
          if (candidate.employerCompanies.length <= 0) {
            const recipient = recipients.find(
              (item) =>
                Number(item.item_search_project_type) === SearchProjectTypes.Candidate && item.id === candidate.id
            );
            return { ...recipient, created_at: moment().format(), type: SendgridEventTypes.withoutemployer };
          }
          return [];
        });

        invalidRecipients.push(...candidateWithoutEmployers);
      }

      const hiringIds = recipients
        .filter((item) => Number(item.item_search_project_type) === SearchProjectTypes.HiringAuthority)
        .map((item) => item.id);
      if (hiringIds.length > 0) {
        const hiringAuthorities = await HiringAuthorityRepository.getHiringByIds(hiringIds);

        const hiringWithoutEmployers = hiringAuthorities.flatMap((hiring) => {
          if (!hiring.company_id) {
            const recipient = recipients.find(
              (item) =>
                Number(item.item_search_project_type) === SearchProjectTypes.HiringAuthority && item.id === hiring.id
            );
            return { ...recipient, created_at: moment().format(), type: SendgridEventTypes.withoutcompany };
          }
          return [];
        });

        invalidRecipients.push(...hiringWithoutEmployers);
      }

      const nameIds = recipients.filter((item) => this.isName(item.item_search_project_type)).map((item) => item.id);
      if (nameIds.length > 0) {
        const names = await NameRepository.getNameByIds(nameIds);

        const namesWithoutEmployers = names.flatMap((name) => {
          if (name.employerCompanies.length <= 0) {
            const recipient = recipients.find(
              (item) => this.isName(item.item_search_project_type) && item.id === name.id
            );
            return { ...recipient, created_at: moment().format(), type: SendgridEventTypes.withoutemployer };
          }
          return [];
        });

        invalidRecipients.push(...namesWithoutEmployers);
      }

      //This part removes the emails that are blocked by the resend option, but it compares each emails instead the whole SP entity
      if (blockedByResendItems) {
        const leftOverRecipients = recipients.flatMap((recipient) => {
          const foundInvalid = invalidEmails.find((row) => _toLowerCase(row.email) === _toLowerCase(recipient.email));
          if (foundInvalid) return [];

          if (recipient.email === null || recipient.email === 'null') return [];

          return recipient;
        });

        const invalidResendRecipients = leftOverRecipients.flatMap((recipient) => {
          switch (Number(recipient.item_search_project_type)) {
            case SearchProjectTypes.Candidate:
              const foundCandidate = blockedByResendItems.candidateIds.find((id) => id === recipient.id);
              if (foundCandidate)
                return { ...recipient, created_at: moment().format(), type: SendgridEventTypes.blockresend };
              break;

            case SearchProjectTypes.HiringAuthority:
              const foundHA = blockedByResendItems.haIds.find((id) => id === recipient.id);
              if (foundHA) return { ...recipient, created_at: moment().format(), type: SendgridEventTypes.blockresend };
              break;

            case SearchProjectTypes.Name:
            case SearchProjectTypes.NameCandidate:
            case SearchProjectTypes.NameHA:
              const foundName = blockedByResendItems.nameIds.find((id) => id === recipient.id);
              if (foundName)
                return { ...recipient, created_at: moment().format(), type: SendgridEventTypes.blockresend };
              break;
          }
          return [];
        });

        invalidRecipients.push(...invalidResendRecipients);
      }

      const compositeKeyFunction = (itemA, itemB) => itemA.email === itemB.email && itemA.id === itemB.id;

      return uniqWith(invalidRecipients, compositeKeyFunction);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return false;
    }
  }

  /**
   *
   * @param {Object} to
   *
   * @summary This methods expects the array of recipients & the emails that will be getting blocked
   *
   * @return {Array}
   */
  getRecipientsMinusBlocked({ recipients }, blockedEmails, invalidEmails) {
    const recipientsMinusBlocked = recipients.flatMap((recipient) => {
      // if (!blockedEmails.includes(recipient)) return { ...recipient, created_at: moment().format() };
      const foundBlocked = blockedEmails.find(
        (row) => _toLowerCase(row.email) === _toLowerCase(recipient.email) && row.id === recipient.id
      );
      if (!foundBlocked) return { ...recipient, created_at: moment().format() };

      return [];
    });

    const recipientsMinusInvalid = recipientsMinusBlocked.flatMap((recipient) => {
      const foundInvalid = invalidEmails.find(
        (row) =>
          _toLowerCase(row.email) === _toLowerCase(recipient.email) &&
          row.item_search_project_type === recipient.item_search_project_type
      );
      if (!foundInvalid) return { ...recipient, created_at: moment().format() };

      return [];
    });

    return recipientsMinusInvalid;
  }

  async buildBulkSendgridJSON(personalizations, emailData, attachments) {
    const bulkBatchId = await Hash.make(`${JSON.stringify(emailData)}${Date.now()}`);
    const suppresionId = await Services.getSendgridSuppressionGroup(SendgridSuppressionGroups.Bulking);
    const envOrigin = Env.get('NODE_ENV');

    return {
      personalizations,
      from: {
        email: emailData.email,
        name: emailData.name,
      },
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html,
      attachments,
      categories: BulkEmailSendgridCategory,
      customArgs: {
        //This will help to identify a bulk batch in the webhook
        bulkBatchId: bulkBatchId,
        envOrigin: envOrigin,
      },
      asm: {
        group_id: suppresionId,
        groups_to_display: [suppresionId],
      },
    };
  }

  async getUnsubscribeFooter() {
    const configFooterRaw = await ModulePresetsConfigRepository.getById('UnsubscribeFooter');
    const configFooter = configFooterRaw ? configFooterRaw.toJSON().data.footer : null;

    const foundFooter = configFooter ? configFooter : UnsubscribeFooter;

    return foundFooter;
  }
}

module.exports = BulkEmail;
