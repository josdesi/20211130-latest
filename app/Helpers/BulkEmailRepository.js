'use strict';

//Models
const SearchProject = use('App/Models/SearchProject');
const User = use('App/Models/User');
const EmailBody = use('App/Models/EmailBody');
const EmailHistory = use('App/Models/EmailHistory');
const EmailTemplate = use('App/Models/EmailTemplate');
const Attachment = use('App/Models/Attachment');
const FileInformation = use('App/Models/FileInformation');
const UserHasTempFile = use('App/Models/UserHasTempFile');
const Candidate = use('App/Models/Candidate');
const BulkEmailMarketingCandidate = use('App/Models/BulkEmailMarketingCandidate');
const BulkEmailRecruitingJobOrder = use('App/Models/BulkEmailRecruitingJobOrder');
const BulkEmailScopeType = use('App/Models/BulkEmailScopeType');
const JobOrder = use('App/Models/JobOrder');
const BulkEmailSendgridWebhookEvent = use('App/Models/BulkEmailSendgridWebhookEvent');
const BulkEmailFailureMessage = use('App/Models/BulkEmailFailureMessage');

//Repositories
const SearchProjectInventoryRepository = new (use('App/Helpers/SearchProjectInventoryRepository'))();
const BulkEmailOptOutRepository = new (use('App/Helpers/BulkEmailOptOutRepository'))();
const CandidateRepository = new (use('App/Helpers/CandidateRepository'))();
const HiringAuthorityRepository = new (use('App/Helpers/HiringAuthorityRepository'))();
const JobOrderRepository = new (use('App/Helpers/JobOrderRepository'))();
const NameRepository = new (use('App/Helpers/NameRepository'))();

//Utils
const BulkEmail = new (use('App/Emails/BulkEmail'))();
const appInsights = require('applicationinsights');
const Database = use('Database');
const moment = use('moment');
const { moveFile, copyFile, deleteServerFile } = use('App/Helpers/FileHelper');
const {
  DateFormats,
  UnsubscribeReasons,
  UnsubscribeReasonTypes,
  BulkEmailScopeTypes,
  activityLogTypes,
  SearchProjectTypes,
  WebSocketNamespaces,
} = use('App/Helpers/Globals');
const { uniq } = use('lodash');
const SendgridService = use('Services/Sendgrid');
const Event = use('Event');
const EventTypes = use('App/Helpers/Events');
const Ws = use('Socket.IO');
const Antl = use('Antl');

//Constants
const SearchProjectItemLimit = 5000;
const statusBulkProgress = {
  Creating: 'creating',
  Sending: 'sending',
  Completed: 'completed',
};

class BulkEmailRepository {
  /**
   * Creates & send an bulk email
   *
   * @summary This method contains the upper logic of calling: the validations, creating the neccesary models for the bulk & sending it trhu sendgrid
   *
   * @param {Object} emailData - An object containing multiple fields neccesaries for the bulk creation & sending
   * @param {Boolean} emailData.is_draft - Expected to be false, since this method creates & sends the bulk email, usually the logic of choosing the method resides in the controller
   * @param {Number} emailData.search_project_id - To what search project this emails will be sent to
   * @param {Object} emailData.block_resend - If on, and a template is being used, allows to set a flag for future bulk allowing to block sending the same bulk to the same search project
   * @param {Date} emailData.block_duration_days - How many days the block resend will look into the past
   * @param {String} emailData.subject - The bulk subject
   * @param {String} emailData.text - The bulk text, usually sent for those recipients with very, very, very, very, very, ..., very old hardware
   * @param {String} emailData.html - The bulk html, or body otherwise
   * @param {Number} emailData.email_template_id - The template used during the bulk creation, helps to check the block resend, the scope validation & the attachments
   * @param {Number[]} emailData.attachment_template_block_list - If a template is chosen, but one attachment is not desired, its id should be here
   * @param {Number} emailData.draft_id - The template id used for the bulk, helps to pass the already uploaded attachments
   * @param {Number[]} emailData.files - The attachments, should be temp file ids
   * @param {Number} emailData.bulk_email_scope_type_id - What scope is the bulk using, really neccesary & helpful during the sending proccess, allow to filter out the recipients
   * @param {Boolean} emailData.block_similar_companies - This variable decides wether to filter out similar companies or not in the bulk flow, only for MARKETING atm
   * @param {Boolean} emailData.block_client_companies - This variable decides wether to filter out client/signed companies, therefore theirs hiring authorities, only for MARKETING atm
   *
   * @param {Number} userId - Who is sending the bulk email
   * @param {Number[]} candidateIds - The candidates which are being market-ed, usually only passed when the email has a marketing scope
   * @param {Number[]} jobOrderIds - The job orders which are being used for recruiting purposes, usually only passed when the email has a recruiting scope
   *
   * @return {Object} bulk email created & sent
   */
  async createAndSend(emailData, userId, candidateIds = [], jobOrderIds = []) {
    let trx;
    try {
      await this.sendSocketMessage(statusBulkProgress.Creating, 'Start', userId);

      const bulkValidation = await this.validateBulk(emailData, userId, candidateIds, jobOrderIds);
      if (!bulkValidation.success) return bulkValidation;
      const blockedByResendItems = emailData.block_resend ? bulkValidation.blockedByResendItems : null;

      trx = await Database.beginTransaction();

      const bulkData = await this.createBulk(emailData, userId, candidateIds, jobOrderIds, trx);
      const { emailBody, emailHistory, attachments } = bulkData;

      const sentData = await this.sendBulk(
        userId,
        candidateIds,
        jobOrderIds,
        emailBody,
        emailHistory,
        attachments,
        blockedByResendItems,
        trx
      );
      if (!sentData.success) {
        await trx.rollback();
        return sentData;
      }

      await trx.commit();

      const result = sentData.emailHistory;
      emailBody.attachments = attachments;
      result.emailBody = emailBody;

      await this.sendSocketMessage(statusBulkProgress.Completed, 'End', userId);

      return {
        success: true,
        code: 201,
        data: result,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      trx && (await trx.rollback());
      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', {
          action: 'sending',
          entity: 'bulk email',
        }),
      };
    }
  }

  /**
   * Create the bulk email information
   *
   * @summary This method contains the upper logic of calling: the validations & creating the neccesary models for the bulk
   *
   * @param {Object} emailData - Check out @method createAndSend for more information on this object
   * @param {Number} userId - Who is sending the bulk email
   * @param {Number[]} candidateIds - The candidates which are being market-ed, usually only passed when the email has a marketing scope
   * @param {Number[]} jobOrderIds - The job orders which are being used for recruiting purposes, usually only passed when the email has a recruiting scope
   *
   * @return {Object} bulk email created
   */
  async create(emailData, userId, candidateIds = [], jobOrderIds = []) {
    const trx = await Database.beginTransaction();

    try {
      const bulkData = await this.createBulk(emailData, userId, candidateIds, jobOrderIds, trx);
      const { emailBody, emailHistory, attachments } = bulkData;

      await trx.commit();

      const result = emailHistory;
      emailBody.attachments = attachments;
      result.emailBody = emailBody;

      return {
        success: true,
        code: 201,
        data: result,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      trx && (await trx.rollback());
      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', {
          action: 'creating',
          entity: 'bulk draft',
        }),
      };
    }
  }

  /**
   * Checks if the bulk information is valid
   *
   * @summary This method checks the validity of the candidates (in case of marketing bulk), the sender, the search project & the draft and attachment
   *
   * @param {Object} emailData - Check out @method createAndSend for more information on this object
   * @param {Number} userId - Who is sending the bulk email
   * @param {Number[]} candidateIds - The candidates which are being market-ed, usually only passed when the email has a marketing scope
   * @param {Number[]} jobOrderIds - The job orders which are being used for recruiting purposes, usually only passed when the email has a recruiting scope
   *
   * @return {Object} A JSON object with success message & and error message in case of failure, and blockedByResendItems in case of success
   */
  async validateBulk(emailData, userId, candidateIds, jobOrderIds) {
    const scopeId = emailData.bulk_email_scope_type_id;
    const searchProjectId = emailData.search_project_id;
    const templateId = emailData.email_template_id;
    const draftId = emailData.draft_id;
    const sendDate = emailData.send_date ? emailData.send_date : moment().format();
    const useBlockResend = emailData.block_resend ? emailData.block_resend : false;
    const blockDurationDays = Number(emailData.block_duration_days) ? Number(emailData.block_duration_days) : 0;
    const blockDateStart = moment(sendDate).subtract(blockDurationDays, 'days').format();
    const blockResendObject = {
      useBlockResend,
      blockDateStart,
      blockDateEnd: sendDate,
    };

    await this.sendSocketMessage(statusBulkProgress.Creating, 'ValidatingCandidates', userId);
    const candidatesValidation = await this.validateCandidates(candidateIds, scopeId);
    if (!candidatesValidation.success) return candidatesValidation;

    await this.sendSocketMessage(statusBulkProgress.Creating, 'ValidatingJobOrder', userId);
    const jobOrdersValidation = await this.validateJobOrders(jobOrderIds, scopeId);
    if (!jobOrdersValidation.success) return jobOrdersValidation;

    await this.sendSocketMessage(statusBulkProgress.Creating, 'ValidatingSender', userId);
    const senderValidation = await this.validateSender(userId);
    if (!senderValidation.success) return senderValidation;

    await this.sendSocketMessage(statusBulkProgress.Creating, 'ValidatingSearchProject', userId);
    const searchProjectValidation = await this.validateSearchProject(searchProjectId, userId);
    if (!searchProjectValidation.success) return searchProjectValidation;

    await this.sendSocketMessage(statusBulkProgress.Creating, 'ValidatingTemplate', userId);
    const templateAndDraftValidation = await this.validateTemplateAndDraft(
      templateId,
      draftId,
      scopeId,
      searchProjectId,
      userId,
      blockResendObject
    );
    if (!templateAndDraftValidation.success) return templateAndDraftValidation;

    await this.sendSocketMessage(statusBulkProgress.Creating, 'ValidationEnd', userId);
    return { success: true, blockedByResendItems: templateAndDraftValidation.blockedByResendItems };
  }

  /**
   * Checks if the sender is allowed to send a bulk email
   *
   * @summary So far this method just checks if the email domain that the user has is valid
   *
   * @param {Number} userId - Who is sending the bulk email
   *
   * @return {Object} A JSON object with success message & and error message in case of failure
   */
  async validateSender(userId) {
    const validEmailDomains = ['@gogpac.com', 'test.com'];

    const user = (await User.query().where('id', userId).first()).toJSON();

    if (!validEmailDomains.some((validEmail) => user.email.includes(validEmail))) {
      const domain = user.email.split('@');
      return {
        success: false,
        code: 400,
        message: `Your account doesn\'t have a valid email domain, '${
          domain[domain.length - 1]
        }' is not on the list of valid email domains`,
      };
    }

    return { success: true };
  }

  /**
   * Checks if a search project is valid to be used in the bulk email
   *
   * @summary This method returns a success variable & message to indicate if a SP is valid or not, and which rules it broke
   *
   * @param {Number} searchProjectId - The search project id, which wil become the recipients fo the bulk email
   * @param {Number} userId - Who is sending the bulk email
   *
   * @return {Object} A JSON object with success message & and error message in case of failure
   */
  async validateSearchProject(searchProjectId, userId) {
    const searchProject = await this.findSearchProject(searchProjectId, userId);
    if (!searchProject) {
      return {
        success: false,
        code: 404,
        message: 'Search project not found',
      };
    }

    const searchProjectItemCount = await SearchProjectInventoryRepository.getInventoryCount(searchProjectId);
    if (Number(searchProjectItemCount) > Number(SearchProjectItemLimit)) {
      return {
        success: false,
        code: 409,
        message: `The Search Project is too big to be used to send a Bulk Email, the limit is: ${SearchProjectItemLimit} and the Search Project has ${searchProjectItemCount} items`,
      };
    }

    return { success: true };
  }

  /**
   * Checks if the template and/or draft passed are valid to be used for the bulk
   *
   * @summary Checks if the draft exists, then checks if the template exists, has a valid scope compared to the bulk being created & if the combination fo search project id and tempalte id is allowed by the block resend
   *
   * @param {Number} templateId - The template chosen by the user
   * @param {Number} draftId - The draft id used to continue the bulk process
   * @param {Number} bulkEmailScopeId - The scope id chosen by the user
   * @param {Number} searchProjectId - The search project chosen by the user
   * @param {Number} userId - Who is sending the bulk email
   * @param {Date} blockDateStart - To what date the block resend will start looking from, i.e: Any email sent from blockDateStart to the blockDateEnd date will activate as on the blocked by resend
   * @param {Date} blockDateEnd - To what date the block resend will stop looking from, i.e: Any email sent from blockDateStart to the blockDateEnd date will activate as on the blocked by resend
   *
   * @return {Object} A JSON object with success message & and error message in case of failure, and blockedByResendItems in case of success & a block resend got true
   */
  async validateTemplateAndDraft(templateId, draftId, bulkEmailScopeId, searchProjectId, userId, blockResendObject) {
    if (draftId) {
      const emailDraft = await EmailHistory.query()
        .where('id', draftId)
        .where('created_by', userId)
        .where('is_sent', false)
        .first();
      if (!emailDraft) {
        return {
          success: false,
          code: 404,
          message: 'Draft not found',
        };
      }
    }

    if (templateId) {
      const emailTemplate = await EmailTemplate.query()
        .with('emailTemplateFolder')
        .where('id', templateId)
        .whereHas('emailTemplateFolder', (builder) => {
          builder.userAllowedRead(userId);
        })
        .first();

      if (!emailTemplate) {
        return {
          success: false,
          code: 404,
          message: 'Email template not found',
        };
      }

      const hasValidScope = await this.templateScopeValidation(templateId, bulkEmailScopeId);
      if (!hasValidScope.success) return hasValidScope;

      const isBlocked = await this.getBlockResendValidation(searchProjectId, templateId, blockResendObject);
      if (!isBlocked.success) return isBlocked;

      return {
        success: true,
        blockedByResendItems: isBlocked.blockedByResendItems,
      };
    }

    return { success: true };
  }

  /**
   * Creates the bulk email models
   *
   * @summary This method does not sends the bulk, merely creates the models & data neccesary in the system for its future send state
   *
   * @param {Object} emailData - Check out @method createAndSend for more information on this object
   * @param {Number} userId - Who is sending the bulk email
   * @param {Number[]} candidateIds - The candidates which are being market-ed, usually only passed when the email has a marketing scope
   * @param {Number[]} jobOrderIds - The job orders which are being used for recruiting purposes, usually only passed when the email has a recruiting scope
   * @param {Database} trx - External transaction object, the transaction should be controlled out side this method, since this method could be part of a bigger scope
   *
   * @return {Object} An object containing the emailBody, emailHistory & attachments created for the bulk
   */
  async createBulk(emailData, userId, candidateIds, jobOrderIds, trx) {
    const scopeId = emailData.bulk_email_scope_type_id;
    const searchProjectId = emailData.search_project_id;
    const templateId = emailData.email_template_id ? emailData.email_template_id : null;
    const draftId = emailData.draft_id;
    const isDraft = emailData.is_draft;
    const blockResend = emailData.block_resend;
    const blockDurationDays = emailData.block_duration_days ? emailData.block_duration_days : null;
    const files = emailData.files;
    const subject = emailData.subject;
    const text = emailData.text;
    const html = emailData.html;
    const blockedTemplateAttachments = emailData.attachment_template_block_list;
    const blockSimilarCompanies = emailData.block_similar_companies ? emailData.block_similar_companies : false;
    const blockClientCompanies = emailData.block_client_companies ? emailData.block_client_companies : false;

    await this.sendSocketMessage(statusBulkProgress.Creating, 'CreatingBulk', userId);

    const emailBody = await EmailBody.create(
      {
        subject,
        text,
        html,
      },
      trx
    );

    const emailHistory = await EmailHistory.create(
      {
        created_by: userId,
        is_sent: !isDraft,
        search_project_id: searchProjectId,
        email_body_id: emailBody.id,
        block_resend: blockResend,
        block_duration_days: blockDurationDays,
        email_template_id: templateId,
        bulk_email_scope_type_id: scopeId,
        block_similar_companies: blockSimilarCompanies,
        block_client_companies: blockClientCompanies,
      },
      trx
    );

    await this.createMarketingCandidates(candidateIds, emailHistory.id, trx);
    await this.createRecruitingJobOrders(jobOrderIds, emailHistory.id, trx);
    const attachments = await this.storeAttachmentsFromFiles(files, userId, emailBody.id, trx);

    if (draftId) {
      const oldAttachments = await this.transferDraftAttachments(draftId, emailBody.id, userId, trx);
      attachments.push(...oldAttachments);

      const result = await this.destroyDraft(draftId, userId, false, trx);
      if (!result.success) return result;
    }

    //If the email comes from a draft, we need to check if the template being passed is different, because if it is the same, we should skip transfering the attachments
    const draftHasDifferentTemplateId = await this.hasDraftDifferentTemplate(draftId, templateId);
    if (templateId && draftHasDifferentTemplateId) {
      const oldAttachments = await this.transferTemplateAttachments(
        templateId,
        emailBody.id,
        userId,
        blockedTemplateAttachments,
        trx
      );
      attachments.push(...oldAttachments);
    }

    await this.sendSocketMessage(statusBulkProgress.Creating, 'BulkCreated', userId);

    return { emailBody, emailHistory, attachments };
  }

  async hasDraftDifferentTemplate(draftId, templateId) {
    if (!draftId) return true;

    const draft = await EmailHistory.query().select('email_template_id').where('id', draftId).first();

    const response = !draft || !draft.email_template_id || Number(draft.email_template_id) !== Number(templateId);
    return response;
  }

  /**
   * Creates a failure draft
   *
   * @summary This method allows to create a failure draft & store the errors
   *
   * @param {Object} emailData - Check out createAndSend for more information on this object
   * @param {Number} userId - to whom the draft belongs to
   * @param {Number[]} candidateIds - The candidates which are being market-ed, usually only passed when the email has a marketing scope
   * @param {Number[]} jobOrderIds - The job orders which are being used for recruiting purposes, usually only passed when the email has a recruiting scope
   * @param {Object} errors - An object containing the errors that caused the bulk email to be converted to a failure draft
   *
   * @return {Object} Failure draft created
   */
  async createFailureDraft(emailData, userId, candidateIds = [], jobOrderIds = [], errors) {
    const trx = await Database.beginTransaction();

    try {
      if (emailData.draft_id) {
        return {
          success: true,
          code: 200,
        };
      }

      const { emailBody, emailHistory, attachments } = await this.createBulk(
        emailData,
        userId,
        candidateIds,
        jobOrderIds,
        trx
      );

      await this.storeFailureDraftErrors(emailHistory.id, errors, trx);

      await trx.commit();

      const result = emailHistory;
      emailBody.attachments = attachments;
      result.emailBody = emailBody;

      return {
        success: true,
        code: 201,
        data: result,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      await trx.rollback();
      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', {
          action: 'creating',
          entity: 'failure draft',
        }),
      };
    }
  }

  /**
   * Stores the draft errors
   *
   * @summary This method stores the draft error, in this case the blocked & invalid emails
   *
   * @param {Number} draftId - The draft to be updated with the errors
   * @param {Object} errors - The errores to be stored
   * @param {Database} trx - External transaction object, the transaction should be controlled out side this method, since this method could be part of a bigger scope
   */
  async storeFailureDraftErrors(draftId, errors, trx) {
    const { blockedEmails = [], invalidEmails = [], message = '' } = errors;

    const draft = await EmailHistory.query().transacting(trx).where('id', draftId).first();
    draft.merge({ emails_blocked: blockedEmails, emails_invalid: invalidEmails });
    await draft.save(trx);

    await BulkEmailFailureMessage.create({ email_history_id: draftId, error_message: message }, trx);

    return true;
  }

  /**
   * Sends a bulk email to its recipients
   *
   * @summary This method sends a bulk email already created, should be usually part two @method createBulk or be called from the scheduler task
   *
   * @param {Number} userId - Who is sending the bulk email
   * @param {Number[]} candidateIds - The candidates which are being market-ed, usually only passed when the email has a marketing scope
   * @param {Number[]} jobOrderIds - The job orders which are being used for recruiting purposes, usually only passed when the email has a recruiting scope
   * @param {Database.model} emailBody - The EmailBody model, This method requires the database object, DO NOT JSON()'d IT BEFORE PASSING IT HERE
   * @param {Database.model} emailHistory - The EmailHistory model, This method requires the database object, DO NOT JSON()'d IT BEFORE PASSING IT HERE
   * @param {Object[]} attachments - An array of objects of the type Attachments model, its origin should be by the JSON() method or the .with('attachments') from the emailHistory, no need for the Database model
   * @param {Object} blockedByResendItems - An object containing the items blocked by the resend function
   * @param {Database} trx - External transaction object, the transaction should be controlled out side this method, since this method could be part of a bigger scope
   *
   * @return {Object} Object with a success message and the EmailHistory updated with the information obtained after sending the bulk email
   */
  async sendBulk(userId, candidateIds, jobOrderIds, emailBody, emailHistory, attachments, blockedByResendItems, trx) {
    const scopeId = emailHistory.bulk_email_scope_type_id;
    const emailHistoryId = emailHistory.id;
    const searchProjectId = emailHistory.search_project_id;
    const user = (await User.query().where('id', userId).with('personalInformation').first()).toJSON();
    const searchProjectEmails = await this.getSearchProjectEmails(searchProjectId);
    const bulkJSON = this.buildBulkJSON(user, emailBody, searchProjectEmails);

    await this.sendSocketMessage(statusBulkProgress.Sending, 'SendingBulk', userId);

    const config = {
      blockSimilarCompanies: emailHistory.block_similar_companies,
      blockClientCompanies: emailHistory.block_client_companies,
    };

    const bulkEmailResponse = await BulkEmail.send(
      bulkJSON,
      attachments,
      emailHistoryId,
      scopeId,
      candidateIds,
      userId,
      config,
      blockedByResendItems
    );

    if (bulkEmailResponse.success === false) {
      //Failures return a false, while ok returns nothings
      return bulkEmailResponse;
    }

    if (bulkEmailResponse.sentRecipients.length === 0) {
      throw new Error('Sendgrid could not send the email to any recipient');
    }

    await this.sendSocketMessage(statusBulkProgress.Sending, 'BulkSent', userId);

    Event.fire(EventTypes.BulkEmail.Sent, {
      searchProjectId,
      userId,
    });

    await emailHistory.merge({
      emails_blocked: bulkEmailResponse.blockedEmails,
      emails_sent: bulkEmailResponse.sentRecipients,
      sendgrid_id: bulkEmailResponse.bulkBatchId,
      send_date: moment.utc().format(DateFormats.SystemDefault),
      is_sent: true,
      emails_invalid: bulkEmailResponse.invalidEmails,
    });

    const itemsForTheActivity = {
      candidateIds,
      jobOrderIds,
      recipients: bulkEmailResponse.recipients,
    };

    await this.createBulkActivity(userId, scopeId, emailHistoryId, itemsForTheActivity);

    await emailHistory.save(trx);

    return { success: true, emailHistory };
  }

  /**
   * Creates a bulk activity on the items selected in the bulk process, as well on the valid recipients
   *
   * @param {Number} userId - Who is sending the bulk email, therefore creating the activity
   * @param {Number} scopeId - The bulk scope
   * @param {Number} emailHistoryId - The bulk reference, or the email history id
   * @param {Number} items - The items that the activities will be created for, contains the candidate & job order selected, and now the recipients too
   * @param {Database} trx - External transaction object, the transaction should be controlled out side this method, since this method could be part of a bigger scope
   */
  async createBulkActivity(userId, scopeId, emailHistoryId, items) {
    const { candidateIds = [], jobOrderIds = [], recipients = [] } = items;
    const activityMessage = `Created by sending a bulk email #${emailHistoryId}`;
    const metadata = { emailHistoryId };
    const candidateActivitiesData = [];
    const nameActivitiesData = [];
    const hiringActivitiesData = [];
    const jobOrdersActivitiesData = [];

    const buildActivityJSON = (itemName, itemValue) => {
      return {
        body: activityMessage,
        activity_log_type_id: activityLogTypes.BulkEmail,
        [itemName]: itemValue,
        created_by_system: true,
        user_id: userId,
        metadata,
      };
    };

    for (const recipient of recipients) {
      switch (Number(recipient.item_search_project_type)) {
        case SearchProjectTypes.Candidate:
          candidateActivitiesData.push(buildActivityJSON('candidate_id', recipient.id));
          break;

        case SearchProjectTypes.HiringAuthority:
          hiringActivitiesData.push(buildActivityJSON('hiring_authority_id', recipient.id));
          break;

        case SearchProjectTypes.Name:
        case SearchProjectTypes.NameCandidate:
        case SearchProjectTypes.NameHA:
          nameActivitiesData.push(buildActivityJSON('name_id', recipient.id));
          break;
      }
    }

    switch (scopeId) {
      case BulkEmailScopeTypes.Marketing:
        for (const candidateId of candidateIds) {
          candidateActivitiesData.push(buildActivityJSON('candidate_id', candidateId));
        }
        break;

      case BulkEmailScopeTypes.Recruiting:
        for (const jobOrderId of jobOrderIds) {
          jobOrdersActivitiesData.push(buildActivityJSON('job_order_id', jobOrderId));
        }
        break;
    }

    const activityPromises = [
      CandidateRepository.createBatchActivity(candidateActivitiesData),
      HiringAuthorityRepository.createBatchActivity(hiringActivitiesData),
      NameRepository.createBatchActivity(nameActivitiesData),
      JobOrderRepository.createBatchActivity(jobOrdersActivitiesData),
    ];
    await Promise.all(activityPromises);
  }

  /**
   * Show a list of bulk email history
   *
   * @param {Object} { keyword, page, perPage }
   * @param {String} user_id
   *
   * @return {Object} Bulk email list with a success message or an error code
   *
   */
  async listing({ keyword, page = 1, perPage = 10 }, user_id) {
    try {
      const subjectFilterQuery = Database.table('email_histories as eh')
        .select(['eh.id'])
        .innerJoin('email_bodies as eb', 'eb.id', 'eh.email_body_id');
      this.applyKeywordClause(keyword, subjectFilterQuery, 'eb.subject');

      const searchProjectFilterQuery = Database.table('email_histories as eh')
        .select(['eh.id'])
        .innerJoin('search_projects as sp', 'sp.id', 'eh.search_project_id');
      this.applyKeywordClause(keyword, searchProjectFilterQuery, 'sp.name');

      const emailHistory = EmailHistory.query()
        .select(
          'id',
          'created_by',
          'is_sent',
          'search_project_id',
          'email_template_id',
          'email_body_id',
          'block_resend',
          'created_at',
          'send_date'
        )
        .with('emailBody', (builder) => builder.select('id', 'subject', 'text').withCount('attachments'))
        .with('searchProject', (builder) => builder.select('id', 'name'))
        // .withCount('scheduledEmail') //Usually knowing if it was a scheduled email here is not neccesary
        .where((builder) => {
          builder.whereIn('id', subjectFilterQuery).orWhereIn('id', searchProjectFilterQuery);
        })
        .where('created_by', user_id)
        .where('is_sent', true)
        .whereNotNull('send_date')
        .orderBy('email_histories.send_date', 'desc');

      const result = await emailHistory.paginate(page, perPage);

      return {
        success: true,
        code: 200,
        data: result,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: 'There was a problem while retrieving the bulk emails history',
      };
    }
  }

  /**
   * Show a list of available bulk scopes
   *
   * @return {Object[]} Bulk email scopes
   */
  async listingScopes() {
    try {
      const result = (await BulkEmailScopeType.all()).toJSON();

      return {
        success: true,
        code: 200,
        data: result,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: 'There was a problem while retrieving the bulk emails history',
      };
    }
  }
  /**
   * Show a list of bulk email history that are drafts
   *
   * @param {Object} { keyword, page, perPage }
   * @param {String} user_id
   *
   * @return {Object} Bulk email list with a success message or an error code
   *
   */
  async listingDrafts({ keyword, page, perPage }, user_id) {
    try {
      const query = Database.table('email_histories as eh')
        .select(['eh.id'])
        .innerJoin('email_bodies as eb', 'eb.id', 'eh.email_body_id');
      this.applyKeywordClause(keyword, query, 'eb.subject');

      let emailHistoryIds = await query;

      emailHistoryIds = emailHistoryIds.map((row) => {
        return row.id;
      });

      const emailHistory = EmailHistory.query()
        .with('emailBody')
        .with('emailBody', (builder) => builder.select('id', 'subject', 'text').withCount('attachments'))
        .with('searchProject', (builder) => builder.select('id', 'name'))
        .whereIn('id', emailHistoryIds)
        .doesntHave('scheduledEmail')
        .where('created_by', user_id)
        .where('is_sent', false)
        .orderBy('updated_at', 'desc');

      const result = await emailHistory.paginate(page ? page : 1, perPage ? perPage : 10);

      return {
        success: true,
        code: 200,
        data: result,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: 'There was a problem when retrieving the drafts',
      };
    }
  }

  /**
   * Makes the temporal files to 'permanent' attachments
   *
   * @summary user has temp files & attachments are almost the same thing, but file_size is a filed itself in the attachment instea of being outside, the temp file & temp file information are deleted
   *
   * @param {Array} files - An array of user has temp files id
   * @param {Number} userId - Who is the user sending the email
   * @param {Number} emailBodyId - Which email this attachment will belong to
   * @param {Object} trx - Transaction, so if anything fails this is covered too!
   *
   * @return {Array} Attachments object's array
   */
  async storeAttachmentsFromFiles(files, userId, emailBodyId, trx) {
    const attachments = [];
    if (files) {
      for (const fileId of files) {
        const fileTempRaw = await UserHasTempFile.query()
          .with('information')
          .where('id', fileId)
          .where('user_id', userId)
          .first();
        if (!fileTempRaw) continue;

        const fileTemp = fileTempRaw.toJSON();
        const fileUrl = await moveFile(fileTemp.file_name, 'attachments/' + fileTemp.file_name);
        await FileInformation.query().where('user_has_temp_file_id', fileId).delete();
        await Database.table('user_has_temp_files').where('id', fileId).where('user_id', userId).del();
        attachments.push(
          await Attachment.create(
            {
              email_body_id: emailBodyId,
              url: fileUrl,
              name: fileTemp.original_name,
              file_size: fileTemp.information.file_size,
            },
            trx
          )
        );
      }
    }

    return attachments;
  }

  /**
   * Update the body of one bulk email draft
   *
   * @param {Number} id
   * @param {Object} drafData = {search_project_id, block_resend, block_duration_days}
   * @param {Object} draftBodyData = {subject, text, html}
   * @param {Object} files
   * @param {Number} user_id
   *
   * @return {Object} Bulk email template new details with a success message or an error code
   *
   */
  async updateDraft(id, drafData, draftBodyData, files, user_id) {
    const trx = await Database.beginTransaction();

    try {
      const emailDraft = await EmailHistory.query()
        .with('emailBody')
        .with('emailBody.attachments')
        .doesntHave('scheduledEmail')
        .where('id', id)
        .andWhere('created_by', user_id)
        .andWhere('is_sent', false)
        .first();

      if (!emailDraft) {
        trx.rollback();
        return {
          success: false,
          code: 404,
          message: 'Could not update the bulk email: email draft not found',
        };
      }

      if (drafData.search_project_id) {
        const searchProject = await this.findSearchProject(drafData.search_project_id, user_id);
        if (!searchProject) {
          trx.rollback();
          return {
            success: false,
            code: 404,
            message: 'Could not update the bulk email: search project not found',
          };
        }

        const isValid = await this.validateSearchProject(searchProject.id, user_id);
        if (!isValid.success) return isValid;
      }

      const attachments = await this.storeAttachmentsFromFiles(
        files,
        user_id,
        emailDraft.getRelated('emailBody').id,
        trx
      );

      await emailDraft.merge(drafData, trx);
      await emailDraft.save(trx);

      await emailDraft.getRelated('emailBody').merge(draftBodyData, trx);
      await emailDraft.getRelated('emailBody').save(trx);

      const result = emailDraft.toJSON();
      result.emailBody.attachments.push(...attachments);

      await trx.commit();
      return {
        success: true,
        code: 200,
        data: result,
      };
    } catch (error) {
      trx.rollback();
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: 'There was a problem when updating the draft',
      };
    }
  }

  /**
   * Delete one of the own bulk email drafts attachments
   *
   * @param {Number} id
   * @param {Number} attachment_id
   * @param {Number} user_id
   *
   * @return {Object} Atachment details that was deleted with a success message or an error code
   *
   */
  async destroyAttachment(id, attachment_id, user_id) {
    const trx = await Database.beginTransaction();
    try {
      const emailDraft = await EmailHistory.query()
        .with('emailBody')
        .with('emailBody.attachments')
        .doesntHave('scheduledEmail')
        .where('id', id)
        .andWhere('created_by', user_id)
        .andWhere('is_sent', false)
        .first();

      if (!emailDraft) {
        trx.rollback();
        return {
          success: false,
          code: 404,
          message: 'Email draft not found',
        };
      }

      const attachments = await (await emailDraft.getRelated('emailBody')).getRelated('attachments');

      const attachment = attachments.rows.find((row) => row.id === attachment_id);

      if (!attachment) {
        trx.rollback();
        return {
          success: false,
          code: 404,
          message: 'Attachment not found',
        };
      }

      await deleteServerFile(attachment.url);
      await attachment.delete(trx);

      const result = attachment;

      await trx.commit();
      return {
        success: true,
        code: 200,
        data: result,
      };
    } catch (error) {
      trx.rollback();
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: 'There was a problem when deleting the attachment',
      };
    }
  }

  /**
   * Delete the body of one bulk email draft
   *
   * @param {Number} id
   * @param {Number} user_id
   *
   * @return {Object} Bulk email template new details with a success message or an error code
   *
   */
  async destroyDraft(id, user_id, destroyAttachments = true, externalTrx = null) {
    const trx = externalTrx ? externalTrx : await Database.beginTransaction();

    try {
      const emailDraft = await EmailHistory.query()
        .with('emailBody')
        .with('emailBody.attachments')
        .with('marketingCandidates')
        .with('recruitingJobOrder')
        .doesntHave('scheduledEmail')
        .where('id', id)
        .andWhere('created_by', user_id)
        .andWhere('is_sent', false)
        .first();

      if (!emailDraft) {
        trx.rollback();
        return {
          success: false,
          code: 404,
          message: 'Email draft not found',
        };
      }

      for (const marketingCandidate of await emailDraft.getRelated('marketingCandidates').rows) {
        await BulkEmailMarketingCandidate.query()
          .transacting(trx)
          .where('candidate_id', marketingCandidate.id)
          .delete();
      }
      for (const recruitingJobOrder of await emailDraft.getRelated('recruitingJobOrder').rows) {
        await BulkEmailRecruitingJobOrder.query()
          .transacting(trx)
          .where('job_order_id', recruitingJobOrder.id)
          .delete();
      }

      await EmailHistory.query().transacting(trx).where('id', emailDraft.id).delete();

      const attachments = await (await emailDraft.getRelated('emailBody')).getRelated('attachments');

      for (const attachment of attachments.rows) {
        if (destroyAttachments) {
          await deleteServerFile(attachment.url);
        }
        await Attachment.query().transacting(trx).where('id', attachment.id).delete();
      }

      await EmailBody.query().transacting(trx).where('id', emailDraft.email_body_id).delete();

      const result = emailDraft.toJSON();

      if (!externalTrx) await trx.commit();
      return {
        success: true,
        code: 200,
        data: result,
      };
    } catch (error) {
      if (!externalTrx) await trx.rollback();
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', {
          action: 'deleting',
          entity: 'bulk draft',
        }),
      };
    }
  }

  /**
   * Show a one specific bulk email history or draft
   *
   * @param {Number} id
   * @param {Number} user_id
   *
   * @return {Object} Bulk email list with a success message or an error code
   *
   */
  async details(id, user_id) {
    try {
      const emailHistory = await EmailHistory.query()
        .with('emailBody')
        .with('marketingCandidates', (builder) => builder._with({ relation: 'personalInformation' }))
        .with('recruitingJobOrder')
        .with('bulkType')
        .with('emailBody.attachments')
        .with('emailTemplate')
        .with('failureMessage')
        .with('searchProject', (builder) => {
          builder
            .select(
              'id',
              'name',
              Database.raw(
                'coalesce(ha_count.total::INTEGER, 0) + coalesce(candidates_count.total::INTEGER, 0) + coalesce(name_count.total::INTEGER, 0) as total_items'
              )
            )
            .joinRaw(
              'left join (select search_project_id, count(*) as total from search_project_candidates group by search_project_id) as candidates_count on candidates_count.search_project_id = search_projects.id'
            )
            .joinRaw(
              'left join (select search_project_id, count(*) as total from search_project_hiring_authorities group by search_project_id) as ha_count on ha_count.search_project_id = search_projects.id'
            )
            .joinRaw(
              'left join (select search_project_id, count(*) as total from search_project_names group by search_project_id) as name_count on name_count.search_project_id = search_projects.id'
            );
        })
        .where('id', id)
        .where('created_by', user_id)
        .first();

      if (!emailHistory) {
        return {
          success: false,
          code: 404,
          message: 'Bulk email history not found',
        };
      }

      const result = emailHistory;

      return {
        success: true,
        code: 200,
        data: result,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: 'There was a problem when retrieving the bulk emails history',
      };
    }
  }

  /**
   * Returns the bare basic info of a bulk email
   *
   * @param {Number} id - The bulk email reference
   * @param {Number} user_id - Who is requesting the reference
   *
   * @return {Object} Bulk email information
   */
  async quickInfo(id, user_id) {
    const emailHistory = await EmailHistory.query()
      .select(['id', 'is_sent', 'search_project_id', 'send_date'])
      .with('searchProject')
      .where('id', id)
      .where('created_by', user_id)
      .first();

    if (!emailHistory) throw new Error(`The bulk email could not be found: ${id}`);

    return emailHistory.toJSON();
  }

  async transferDraftAttachments(draftId, bodyId, user_id, trx) {
    const emailDraft = await EmailHistory.query()
      .with('emailBody')
      .with('emailBody.attachments')
      .where('id', draftId)
      .andWhere('created_by', user_id)
      .andWhere('is_sent', false)
      .first();

    const bodyAttachments = await (await emailDraft.getRelated('emailBody')).getRelated('attachments');

    const attachments = [];
    for (const attachment of bodyAttachments.rows) {
      attachments.push(
        await Attachment.create(
          {
            email_body_id: bodyId,
            url: attachment.url,
            name: attachment.name,
            file_size: attachment.file_size,
          },
          trx
        )
      );
    }

    return attachments;
  }

  async transferTemplateAttachments(templateId, bodyId, user_id, attachment_template_block_list, trx) {
    const emailTemplate = await EmailTemplate.query()
      .with('emailBody')
      .with('emailBody.attachments')
      .whereHas('emailTemplateFolder', (builder) => {
        builder.andWhere(function () {
          this.where('is_private', false);
          this.orWhere('created_by', user_id);
        });
      })
      .where('id', templateId)
      .first();

    const bodyAttachments = await (await emailTemplate.getRelated('emailBody')).getRelated('attachments');

    const attachments = [];
    for (const attachment of bodyAttachments.rows) {
      if (attachment_template_block_list) {
        if (attachment_template_block_list.find((id) => id == attachment.id)) continue;
      }

      const name = attachment.name.slice(0, attachment.name.lastIndexOf('.'));
      const extension = attachment.name.slice(attachment.name.lastIndexOf('.'));

      const fileName = `${name}-${new Date().getTime()}${extension}`;

      const fileCopyResult = await copyFile(attachment.url, 'attachments', fileName);

      if (!fileCopyResult.success) {
        throw fileCopyResult.error;
      }
      attachments.push(
        await Attachment.create(
          {
            email_body_id: bodyId,
            url: fileCopyResult.url,
            name: attachment.name,
            file_size: attachment.file_size,
          },
          trx
        )
      );
    }

    return attachments;
  }

  /**
   * Checks if the candidate is valid
   *
   * @description A valid marketing candidate has a company employer, ..., add more rules here if needed
   *
   * @param {Number} candidateIds - Candidate being validated
   *
   * @return {Object} An object containing success and an error message in case not
   */
  async validateCandidates(candidateIds, bulkEmailScopeId) {
    if (bulkEmailScopeId === BulkEmailScopeTypes.Marketing && candidateIds.length <= 0) {
      return {
        success: false,
        code: 409,
        message: `You did not pass any candidate to market in the bulk`,
      };
    }

    const candidateWithEmployers = (
      await Candidate.query()
        .whereIn('id', candidateIds)
        .with('employerCompanies', (builder) => builder.where('is_current_company', true))
        .with('personalInformation')
        .fetch()
    ).toJSON();

    const candidateWithOutEmployers = candidateWithEmployers.flatMap((candidate) => {
      if (candidate.employerCompanies.length <= 0) return candidate;
      return [];
    });

    if (candidateWithOutEmployers.length <= 0) return { success: true };

    const invalidCandidates = candidateWithOutEmployers.map((row) => ` ${row.personalInformation.full_name}`);
    return {
      success: false,
      code: 409,
      message: `The candidate(s):${invalidCandidates.toString()} does not have any employer`,
    };
  }

  /**
   * Checks if the job orders are valid
   *
   * @description A valid recruiting job order must exist, add more rules here if needed
   *
   * @param {Number} jobOrderIds - Job orders being validated
   *
   * @return {Object} An object containing success and an error message in case not
   */
  async validateJobOrders(jobOrderIds, bulkEmailScopeId) {
    if (bulkEmailScopeId === BulkEmailScopeTypes.Recruiting && jobOrderIds.length <= 0) {
      return {
        success: false,
        code: 409,
        message: `You did not pass any job order for recruiting purposes in the bulk`,
      };
    }

    const jobOrders = (await JobOrder.query().whereIn('id', jobOrderIds).fetch()).toJSON();

    if (jobOrders.length < jobOrderIds.length) {
      const notFoundIds = jobOrderIds.filter((passedId) => !jobOrders.find(({ id }) => passedId === id));
      if (notFoundIds.length > 0)
        return {
          success: false,
          code: 404,
          message: `The job orders: ${notFoundIds.toString()} were not found`,
        };
    }

    return { success: true };
  }

  /**
   * Adds a marketing candidate relationship to a bulk email
   *
   * @description A marketing candidate is usually passed when the bulk is marketing scope, this method takes care in case no candidateId is passed. This method is mostly for log purposes
   *
   * @param {Number[]} candidateIds - Which candidates are being market-ed in the bulk email
   * @param {Number[]} emailHistoryId - The bulk email reference
   * @param {Database} trx - The transactions used in the super flow
   *
   * @return {Number} How many relationshop were created
   */
  async createMarketingCandidates(candidateIds, emailHistoryId, trx) {
    if (!candidateIds || candidateIds.length === 0) return 0;

    const relations = candidateIds.map((id) => {
      return { candidate_id: id, email_history_id: emailHistoryId };
    });
    return await BulkEmailMarketingCandidate.createMany(relations, trx);
  }

  /**
   * Adds a recruiting job order relationship to a bulk email
   *
   * @description A recruiting job order is usually passed when the bulk is recruiting scope, this method takes care in case no jobOrderId is passed. This method is mostly for log purposes
   *
   * @param {Number[]} jobOrderIds - Which job order is the bulk email recruiting for
   * @param {Number[]} emailHistoryId - The bulk email reference
   * @param {Database} trx - The transactions used in the super flow
   *
   * @return {Number} How many relationshop were created
   */
  async createRecruitingJobOrders(jobOrderIds, emailHistoryId, trx) {
    if (!jobOrderIds || jobOrderIds.length === 0) return 0;

    const relations = jobOrderIds.map((id) => {
      return { job_order_id: id, email_history_id: emailHistoryId };
    });
    return await BulkEmailRecruitingJobOrder.createMany(relations, trx);
  }

  /**
   * This method is expected to be used when an Bulk Email has bent sent, it removes the attachments from the host, not the reference itself!
   *
   * @description !Be careful not to use this on a template or scheduled email! This delete the attachments from a email history/bulk email, since the attachments were sent already by base64, hosting attachments is unnecesary space wasted
   *
   * @param {Number} emailBodyId - The email body id, the attachments use this id as FK
   *
   * @return {Number} How many attachments were deleted
   *
   */
  async removeSentAttachments(emailBodyId) {
    const attachments = (await Attachment.query().where('email_body_id', emailBodyId).fetch()).toJSON();

    if (attachments.length <= 0) return 0;

    const urls = attachments.map((attachment) => attachment.url);

    for (const url of urls) {
      await deleteServerFile(url);
    }

    return urls.length;
  }

  /**
   * This guard method checks if the template passed has the scope desired
   *
   * @description This method is expected to be called in the create bulk method, when a template is used, the scope of the email must be contained at least in the template
   *
   * @param {Number} templateId - Template id
   * @param {Number} bulk_email_scope_type_id - The scope desired to be used in the bulking, selected by the user
   *
   * @return {Object} An object containing information, with a success to know if everything went fine
   *
   */
  async templateScopeValidation(templateId, bulk_email_scope_type_id) {
    const emailTemplate = await EmailTemplate.query().with('bulkType').where('id', templateId).first();

    if (!emailTemplate) {
      return {
        success: false,
        code: 404,
        message: 'Email template not found',
      };
    }

    const templateScopeValidation = emailTemplate.toJSON();

    if (!templateScopeValidation.bulkType) {
      return {
        success: false,
        code: 409,
        message:
          'The template does not have a scope, please ask your coach to add at least one scope for the template you want to use',
      };
    }

    if (templateScopeValidation.bulkType.id !== bulk_email_scope_type_id) {
      return {
        success: false,
        code: 409,
        message: 'The template you are using has a different scope other than the one you passed',
      };
    }

    return { success: true };
  }

  /**
   * This guard checks if the template has been used in any other bulk with the block resend option
   *
   * @description The aim of this method is to check if a bulk & search project matches any other bulk with the block resend activated. It checks too per recipient if they have been sent the same email, returns an array of those emails that should be blocked
   *
   * @param {Number} searchProjectId - The search project chosen by the user
   * @param {Number} templateId - The template chosen by the user
   * @param {Object} blockResendObject - A config object containing the neccesary variables to do the block resend validation
   * @param {Date} blockResendObject.useBlockResend - Allow to even let or not execute the logic of block resend
   * @param {Date} blockResendObject.blockDateStart - To what date the block resend will start looking from, i.e: Any email sent from blockDateStart to the blockDateEnd date will activate as on the blocked by resend
   * @param {Date} blockResendObject.blockDateEnd - To what date the block resend will stop looking from, i.e: Any email sent from blockDateStart to the blockDateEnd date will activate as on the blocked by resend
   * @param {Number} scheduledEmailHistoryId - Used when the a scheduled email is being updated, this allows to not block the email itself
   *
   * @return {Object} { sucess, blockedByResendItems} - An object containing a sucess & an array of the emails that should be blocked, if failed then a classic message
   */
  async getBlockResendValidation(searchProjectId, templateId, blockResendObject, scheduledEmailHistoryId = 0) {
    const { useBlockResend, blockDateStart, blockDateEnd } = blockResendObject;
    let blockedByResendItems = null;

    if (!useBlockResend) return { success: true, blockedByResendItems };

    const sameTemplates = await EmailHistory.query()
      .where('is_sent', true)
      .where('email_template_id', templateId)
      .whereBetween('send_date', [blockDateStart, blockDateEnd])
      .fetch();

    const sameTemplatesArray = sameTemplates.toJSON();

    if (sameTemplatesArray.length > 0) {
      let candidateIds = [];
      let haIds = [];
      let nameIds = [];

      for (const sameTemplate of sameTemplatesArray) {
        for (const recipient of sameTemplate.emails_sent) {
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
      }

      blockedByResendItems = {
        candidateIds: uniq(candidateIds),
        haIds: uniq(haIds),
        nameIds: uniq(nameIds),
      };
    }

    const blockEmailBySchedule = await EmailHistory.query()
      .with('scheduledEmail')
      .whereHas('scheduledEmail', (builder) => builder.whereBetween('send_date', [blockDateStart, blockDateEnd]))
      .where('is_sent', false)
      .where('search_project_id', searchProjectId)
      .where('email_template_id', templateId)
      .whereNot('id', scheduledEmailHistoryId)
      .first();

    if (blockEmailBySchedule) {
      return {
        success: false,
        code: 409,
        message: 'This bulk email has been already scheduled to the search project provided',
        data: blockEmailBySchedule,
      };
    }

    return { success: true, blockedByResendItems };
  }

  /**
   * Stores the bulk sendgrid events, for faster querying times to the metrics
   *
   * @summary This method is expected to be called from the webhook, any events will be added (appended) to a email history by the sendgrid key
   *
   * @param {Object[]} sendgridSuccess - An array containing the deemed 'success' events
   * @param {Object[]} sendgridFailures - An array containing the deemed 'failures' events
   */
  async storeBulkSendgridEvents(sendgridSuccess, sendgridFailures) {
    const trx = await Database.beginTransaction();
    try {
      const useTimestamps = true;
      const sendgridEvents = [...sendgridSuccess, ...sendgridFailures]; //I want to separate them... but I believe better filtering them out on execution time (using the event value) is far better

      await this.bulkInsert(BulkEmailSendgridWebhookEvent, sendgridEvents, trx, useTimestamps);

      await trx.commit();

      return {
        success: true,
      };
    } catch (error) {
      await trx.rollback();
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: 'There was a problem when updating the sendgrid status',
      };
    }
  }

  async bulkInsert(model, data, trx, useTimestamps) {
    if (useTimestamps === true) {
      const now = moment.utc().format(DateFormats.SystemDefault);
      for (const row of data) {
        row.created_at = now;
        row.updated_at = now;
      }
    }

    return await Database.table(model.table).transacting(trx).insert(data, ['*']);
  }

  async findSearchProject(id, user_id) {
    return await SearchProject.query()
      .where('id', id)
      .andWhere(function () {
        this.where('created_by', user_id);
        this.orWhere('is_private', false);
      })
      .first();
  }

  buildBulkJSON(user, { subject, text, html }, searchProjectEmails) {
    return {
      recipients: searchProjectEmails,
      email: user.email,
      name: user.personalInformation.full_name,
      subject,
      text,
      html,
    };
  }

  async getSearchProjectEmails(search_project_id) {
    const result = await SearchProjectInventoryRepository.getInventoryDetails(search_project_id);

    if (result.code != 200) {
      throw { message: 'Could not get inventory details, therefore emails' };
    }

    return result.data.map((item) => {
      return {
        id: item.id,
        item_search_project_type: Number(item.item_search_project_type),
        email: item.email,
        full_name: item.full_name,
        specialty: item.specialty,
        subspecialty: item.subspecialty,
      };
    });
  }

  /**
   * Checks the passed emails their current status in sendgrid against our unsubscription status, if it differs, then update it
   *
   * @summary This method allows to update a email whenever a unsubscrption/resubscription occurs in the webhook event
   *
   * @param {String} email - The email to check
   * @param {number} suppressionGroupId - Against what suppression group id the email will be checked
   * @param {String} timestamp - The sendgrid timestamp, should be already converted off from unix
   *
   * @returns {void}
   */
  async checkEmailSubscriptionStatus(email, suppressionGroupId, timestamp) {
    try {
      const { body } = await SendgridService.getGroupSuppression(suppressionGroupId);

      const sendgridUnsubFound = body.find((row) => row === email);

      const reasonId = UnsubscribeReasons.find(
        (row) => row.description === 'Other' && row.unsubscribe_reason_type_id === UnsubscribeReasonTypes.User.id
      ).id;

      if (sendgridUnsubFound) {
        await BulkEmailOptOutRepository.createUnsubscribe(
          {
            email,
            custom_reason: 'Created from sendgrid unsubscribe',
            unsubscribe_reason_id: reasonId,
          },
          timestamp
        );
      } else {
        await BulkEmailOptOutRepository.destroySendgridUnsubscribe(email, timestamp);
      }
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      const code = error.code ? error.code : error.statusCode;
      return {
        success: false,
        statusCode: code ? code : 500,
        message: error.message ? error.message : 'Could not check the email subscription status',
      };
    }
  }

  /**
   * Return the where clause to apply on the query.
   * GET where clause
   *
   */
  applyKeywordClause(keyword, query, field) {
    if (keyword) {
      query.where(field, 'ilike', `%${keyword}%`);
    }
  }

  /**
   * Sends a message to a ws channel
   *
   * @description Sends the message passes by the messageOption to the channel passed
   *
   * @param {Ws} channel - The ws Channel
   * @param {String} messageOption - The message to send
   *
   * @return {Object} { sucess, blockedByResendItems} - An object containing a sucess & an array of the emails that should be blocked, if failed then a classic message
   */
  async sendSocketMessage(status, messageOption, userId) {
    if (!Ws.io) return;

    const message = {
      status,
      description: Antl.formatMessage(`loading.bulkemail.creation.${messageOption}`),
    };
    if (!message.description) throw new Error(`Message not found for the option passed: ${messageOption}`);

    const bulkEmailWs = Ws.io.of(WebSocketNamespaces.BulkEmail);

    bulkEmailWs.to(`user:${userId}`).emit('message', { ...message });
  }

  /**
   * Obtains the bulk body preview
   *
   * @summary This method generates the bulk body preview, by using the HTML (body) passed & filling the smartags with info from the SearchProject items
   *
   * @param {String} body - The bulk body, AKA HTML
   * @param {Number} searchProjectId - The search project being used
   * @param {Number} userId - The user requesting the body preview
   *
   * @return {Object} Bulk Body Preview
   */
  async generateBodyPreview(body, searchProjectId, userId) {
    try {
      const searchProjectEmails = await this.getSearchProjectEmails(searchProjectId);

      const recipientsWithSmartags = await BulkEmail.addSmartagsToRecipients(searchProjectEmails, userId);
      if (recipientsWithSmartags.success === false) return recipientsWithSmartags;

      const selectedRecipient = recipientsWithSmartags[0];
      const smartags = selectedRecipient.substitutions;

      let parsedBody = body;

      for (const smartag of Object.keys(smartags)) {
        const smartagToParse = new RegExp(`{{${smartag}}}`, 'igm');
        const smartagValue = smartags[smartag];

        parsedBody = parsedBody.replace(smartagToParse, smartagValue);
      }

      const footer = (await BulkEmail.getUnsubscribeFooter()).replace('<%asm_preferences_raw_url%>', '#');

      parsedBody = `${parsedBody} ${footer}`;

      const data = {
        body: parsedBody,
        to_email: selectedRecipient.email,
        to_name: selectedRecipient.full_name,
      };

      return {
        success: true,
        code: 200,
        data,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', {
          action: 'obtaining',
          entity: 'bulk preview',
        }),
      };
    }
  }
}

module.exports = BulkEmailRepository;
