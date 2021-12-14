'use strict';

/*
 * Microsoft Graph Class
 *
 * All methods that have some logic on top of the library should belong here
 * It cannot be initialized as a service since it does not need a initialization, as it is dependant on the client access_token, so making a static service should be proven futile
 *
 */

//Repositories
const UserRepository = new (use('App/Helpers/UserRepository'))();

//Models
const MicrosoftGraphToken = use('App/Models/MicrosoftGraphToken');
const MicrosoftGraphSubscription = use('App/Models/MicrosoftGraphSubscription');
const MicrosoftSubscriptionMail = use('App/Models/MicrosoftSubscriptionMail');
const User = use('App/Models/User');
const MicrosoftGraphChangeLog = use('App/Models/MicrosoftGraphChangeLog');

//Graph Packages
const graph = require('@microsoft/microsoft-graph-client');
require('cross-fetch/polyfill');

//Utils
const appInsights = require('applicationinsights');
const BulkEmail = new (use('App/Emails/BulkEmail'))();
const Drive = use('Drive');
const Encryption = use('Encryption');
const moment = use('moment');
const Env = use('Env');
const axios = require('axios');
const Antl = use('Antl');
const Database = use('Database');
const {
  DateFormats,
  MicrosoftGraphErrorCodes,
  OperationType,
  EntityTypes,
  userRoles,
  joinStringForQueryUsage,
  activityLogTypes,
  nameTypes,
  MicrosoftGraphSubscriptionTypes,
} = use('App/Helpers/Globals');
const Event = use('Event');
const EventTypes = use('App/Helpers/Events');
const CustomString = use('App/Utils/CustomString');

class MicrosoftGraph {
  async getClient(userId) {
    const microsoftGraphToken = await MicrosoftGraphToken.findBy('user_id', userId);

    if (!microsoftGraphToken) return false;

    const accessToken = await this.getAccessTokenAndSave(microsoftGraphToken, userId);

    if (!accessToken) return false;

    // Initialize Graph client
    return graph.Client.init({
      // Use the provided access token to authenticate
      // requests
      authProvider: (done) => {
        done(null, accessToken);
      },
    });
  }

  async getClientBySubscriptionId(subscriptionId) {
    const microsoftGraphSubscription = await MicrosoftGraphSubscription.findBy('subscription_id', subscriptionId);
    if (!microsoftGraphSubscription) return false;

    return {
      client: await this.getClient(microsoftGraphSubscription.user_id),
      userId: microsoftGraphSubscription.user_id,
      resource: microsoftGraphSubscription.resource,
    };
  }

  /**
   * Refresh a user access token
   *
   * @summary This method allows to obtain the new access token by using the refresh token
   *
   * @param {Object} microsoftGraphToken - The database model of MicrosoftGraphToken
   *
   * @return {Object} Message & success status
   */
  async getAccessTokenAndSave(microsoftGraphToken, userId) {
    try {
      const nowDate = moment().subtract(180, 'seconds').format(DateFormats.AgendaFormat);
      const expirationDate = moment(microsoftGraphToken.expires_on).format(DateFormats.AgendaFormat);

      if (nowDate < expirationDate) return Encryption.decrypt(microsoftGraphToken.token);

      const refreshToken = Encryption.decrypt(microsoftGraphToken.refresh_token);

      let params = new URLSearchParams();
      params.append('grant_type', 'refresh_token');
      params.append('refresh_token', refreshToken);
      params.append('client_id', Env.get('OAUTH_APP_ID'));
      params.append('client_secret', Env.get('OAUTH_APP_SECRET'));

      const loginResponse = await axios.post(Env.get('URL_LOGIN'), params);

      const { access_token, refresh_token, expires_in } = loginResponse.data;

      await UserRepository.saveMicrosoftGraphToken(userId, access_token, refresh_token, expires_in);

      return access_token;
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      appInsights.defaultClient.trackEvent({
        name: 'Microsoft Graph Get Access Token',
        properties: { microsoftGraphToken, userId },
      });
      return false;
    }
  }

  async getOnBehalfClient() {
    const accessToken = await this.getOnBehalfAccessToken();

    if (!accessToken) return false;

    return graph.Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      },
    });
  }

  /**
   * Obtains the on behalf access token
   *
   * @summary This method allows to obtain the new access token by POSTing to the Graph URL
   *
   * @return {Object} Message & success status
   */
  async getOnBehalfAccessToken() {
    try {
      let params = new URLSearchParams();
      params.append('client_id', Env.get('GRAPH_ON_BEHALF_CLIENT_ID'));
      params.append('scope', 'https://graph.microsoft.com/.default');
      params.append('client_secret', Env.get('GRAPH_ON_BEHALF_SECRET'));
      params.append('grant_type', 'client_credentials');

      const onBehalfResponse = await axios.post(Env.get('URL_LOGIN'), params);

      const { access_token } = onBehalfResponse.data;

      return access_token;
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      appInsights.defaultClient.trackEvent({
        name: 'Microsoft Graph Get Access Token failure',
        properties: error,
      });
      return false;
    }
  }

  async azureBlobsToAttachments(azureBlobs) {
    const attachments = [];

    if (!azureBlobs) return attachments;

    for (const { name, url } of azureBlobs) {
      const pathFile = url.split('/files/');

      if (pathFile.length <= 0) continue;

      const path = pathFile[1];

      if (await Drive.disk('azure').exists(path)) {
        const stream = (await Drive.disk('azure').getStream(path)).readableStreamBody;
        stream.setEncoding('base64');

        const base64String = await BulkEmail.streamToString(stream);

        attachments.push({
          '@odata.type': '#microsoft.graph.fileAttachment',
          name: name,
          contentType: BulkEmail.getMIMEType(name),
          contentBytes: base64String,
        });
      }
    }

    return attachments;
  }

  rawAttachmentsToAttachments(rawAttachments) {
    const attachments = [];

    if (!rawAttachments) return attachments;

    for (const rawAttachment of rawAttachments) {
      attachments.push({
        '@odata.type': '#microsoft.graph.fileAttachment',
        ...rawAttachment,
      });
    }

    return attachments;
  }

  /**
   * Sends an email using outlook
   *
   * @summary This method allows the user to send an email by using Microsoft graph mailing service, outlook
   *
   * @param {Object} recipientData - An object containing the recipient information
   * @param {String[]} recipientData.recipients - An array of recipients, the simple 'to'
   * @param {String[]} recipientData.ccRecipients - An array of cc recipients, the simple 'cc'
   * @param {String[]} recipientData.bccRecipients - An array of bcc recipients, the simple 'bcc'
   * @param {Object} messageData - An object containing the body/message information
   * @param {String} messageData.subject - The string that will be the subject
   * @param {Object} messageData.body - An object containing the body type & body content
   * @param {String} messageData.body.contentType - The content type, usually text or html
   * @param {String} messageData.body.content - The body, or what will be displayed
   * @param {Object} config - The configurations that the email can use
   * @param {Boolean} config.saveToSentItems - Wether to show or not the email in the sent emails folder for the user
   * @param {Object} attachments - The object containing the two types of attachments
   * @param {Object} attachments.raw - Raw attachments, meaning you pass the name, contentType, contentBytes
   * @param {Object} attachments.azureBlobs - Azure blobs, meaning you pass the azure disk path URL & the file name
   *
   * @return {Object} Message & success status
   */
  async sendEmail(recipientData, messageData, config = {}, userId, attachments = {}) {
    try {
      const client = await this.getClient(userId);
      if (!client)
        return {
          success: false,
          message: Antl.formatMessage('messages.error.microsoftgraph.logOut', { service: 'mailing service' }),
          code: 401,
        };

      const formatEmailSimpleArray = (array) =>
        array.map((email) => {
          return {
            emailAddress: {
              address: email,
            },
          };
        });

      const attachmentsFromAzure = await this.azureBlobsToAttachments(attachments.azureBlobs);
      const rawAttachments = this.rawAttachmentsToAttachments(attachments.raw);

      // Build a Graph mail body
      const sendMail = {
        message: {
          subject: messageData.subject,
          body: messageData.body,
          toRecipients: formatEmailSimpleArray(recipientData.recipients),
          attachments: [...attachmentsFromAzure, ...rawAttachments],
        },
        saveToSentItems: config.saveToSentItems ? true : false,
      };

      if (recipientData.ccRecipients && recipientData.ccRecipients.length > 0) {
        sendMail.message.ccRecipients = formatEmailSimpleArray(recipientData.ccRecipients);
      }

      if (recipientData.bccRecipients && recipientData.bccRecipients.length > 0) {
        sendMail.message.bccRecipients = formatEmailSimpleArray(recipientData.bccRecipients);
      }

      //If on behalf, then a different response will be returned
      let result = {};
      if (config.onBehalf) {
        result = await this.sendOnBehalfMail(userId, sendMail, config);
      } else {
        result = await this.sendOwnMail(client, sendMail);
      }

      if (!result.success) return result;

      const { response, eventConfig } = result.data;

      Event.fire(EventTypes.MicrosoftGraph.EmailSent, {
        email: eventConfig.email,
        entity: EntityTypes.MicrosoftGraphAction,
        operation: eventConfig.operation,
        payload: { sent: { recipientData, messageData, config, userId }, result: response },
        userId,
      });

      return { success: true, data: response };
    } catch (error) {
      const properties = {
        error,
        payload: {
          recipientData,
          messageData,
          config,
          userId,
          attachments,
        },
      };
      appInsights.defaultClient.trackEvent({ name: 'Microsoft Graph Send Email Failed', properties });
      appInsights.defaultClient.trackException({ exception: error });

      let message = Antl.formatMessage('messages.error.microsoftgraph.genericError');
      let code = 500;
      if (error.code && MicrosoftGraphErrorCodes.includes(error.code)) {
        const bodyError = JSON.parse(error.body);
        message = bodyError.message;
        code = error.statusCode;
      }

      return { success: false, message, error, code };
    }
  }

  async renewMicrosoftGraphSubscription(subscriptionId) {
    try {
      const microsoftGraphSubscription = await MicrosoftGraphSubscription.findBy('subscription_id', subscriptionId);
      if (!microsoftGraphSubscription) return false;

      const userId = microsoftGraphSubscription.user_id;
      const newExpirationDateTime = moment().add(70, 'hour').format();

      const client = await this.getClient(userId);
      if (!client) throw new Error('Could not renew the Microsoft Graph Client');

      const response = await client.api(`/subscriptions/${subscriptionId}`).patch({
        expirationDateTime: newExpirationDateTime,
      });

      await UserRepository.saveMicrosoftGraphSubscriptionToken(userId, response.id, newExpirationDateTime, {
        removeOldSubscription: false,
        resource: microsoftGraphSubscription.resource,
      });

      return { success: true, subscriptionId };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return { success: false, error, subscriptionId };
    }
  }

  async generateMicrosoftGraphSubscription(userId, resource) {
    try {
      const client = await this.getClient(userId);
      if (!client) throw new Error('Could not generate the Microsoft Graph Client');

      const baseURL = Env.get('PUBLIC_URL_API');
      const graphWebhookURL = Env.get('GRAPH_SUBSCRIPTION_URL');

      const outlookSubscription = {
        changeType: 'created',
        notificationUrl: `${baseURL}${graphWebhookURL}`,
        resource: resource.value,
        expirationDateTime: moment().add(70, 'hour').format(),
        clientState: Env.get('CLIENT_STATE'),
      };

      const response = await client.api('/subscriptions').post(outlookSubscription);

      await UserRepository.saveMicrosoftGraphSubscriptionToken(
        userId,
        response.id,
        outlookSubscription.expirationDateTime,
        { resource: resource.key }
      );
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      appInsights.defaultClient.trackEvent({ name: 'Microsoft Graph Subscription Failed', properties: { userId } });
    }
  }

  async deleteMicrosoftGraphSubscription(userId, subscriptionId) {
    try {
      const client = await this.getClient(userId);
      if (!client) throw new Error('Could not delete the Microsoft Graph Client');

      await client.api(`/subscriptions/${subscriptionId}`).delete();
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      appInsights.defaultClient.trackEvent({
        name: 'Microsoft Graph Delete Subscription Failed',
        properties: { userId },
      });
    }
  }

  /**
   * Gets an email from outlook, by using the id
   *
   * @summary This method allows principaly the webhook flow to get an email by the id
   *
   * @param {Object} subscriptionId - The subscription from which the webhook was called from, allows to obtain which user the message is from
   * @param {Object} messageId - The email id which happened the event from, usually a sent email
   *
   * @return {Object} Message & success status
   */
  async getEmail(subscriptionId, messageId) {
    try {
      const { client, userId, resource } = await this.getClientBySubscriptionId(subscriptionId);
      if (!client)
        return {
          success: false,
          message: Antl.formatMessage('messages.error.microsoftgraph.logOut', { service: 'mailing service' }),
          code: 401,
        };

      const response = await client.api(`/me/messages/${messageId}`).get();

      const emailPayload = {
        subject: response.subject,
        body: response.body,
        bodyPreview: response.bodyPreview,
        conversationId: response.conversationId,
        conversationIndex: response.conversationIndex,
        internetMessageId: response.internetMessageId,
        mailId: response.id,
        isDraft: response.isDraft,
        sender: {
          address: CustomString(response.sender.emailAddress.address).toCompare(),
          name: response.sender.emailAddress.name,
        },
        recipients: response.toRecipients,
        ccRecipients: response.ccRecipients,
        userId,
        resource,
      };

      Event.fire(EventTypes.MicrosoftGraph.MailObtained, emailPayload);

      return { success: true, emailPayload };
    } catch (error) {
      const properties = {
        error,
        payload: {
          subscriptionId,
          messageId,
        },
      };
      appInsights.defaultClient.trackEvent({ name: 'Microsoft Graph Get Email Failed', properties });
      appInsights.defaultClient.trackException({ exception: error });

      let message = Antl.formatMessage('messages.error.microsoftgraph.genericError');
      let statusCode = 500;
      if (error.code && MicrosoftGraphErrorCodes.includes(error.code)) {
        const bodyError = JSON.parse(error.body);
        message = bodyError.message;
        statusCode = error.statusCode;
      }

      return { success: false, message, error, statusCode };
    }
  }

  async storeMail(emailPayload) {
    const {
      conversationId,
      mailId,
      sender,
      subject,
      recipients,
      ccRecipients = [],
      userId,
      body,
      bodyPreview,
      resource,
    } = emailPayload;
    let trx;

    try {
      const mailExists = await MicrosoftSubscriptionMail.query().where('mail_id', mailId).first();
      if (mailExists) return { success: true, message: 'Mail exists' };

      const recruiter = await User.query().where({ id: userId }).first();
      if (!recruiter) return { success: false, message: 'Recruiter not found' };

      const emailIsValidForTracking = await this.validateEmailForTracking(sender.address, recipients, ccRecipients);
      if (!emailIsValidForTracking.success) return emailIsValidForTracking;

      trx = await Database.beginTransaction();

      const microsoftMail = await MicrosoftSubscriptionMail.create({
        conversation_id: conversationId,
        mail_id: mailId,
        sender: sender.address,
        subject,
        recipients,
        cc_recipients: ccRecipients,
        user_id: userId,
        body,
        body_preview: bodyPreview,
      });

      const activityMessage = this.getEmailTrackingActivityMessage(sender, recipients, ccRecipients, subject);

      const formatedSender = { emailAddress: sender };
      const allParticipants = [...recipients, ...ccRecipients];
      if (resource === MicrosoftGraphSubscriptionTypes.mail.inbox.key) {
        allParticipants.push(formatedSender);
      }

      await this.createInventoryMailActivity(activityMessage, allParticipants, recruiter.id, microsoftMail.id, trx);

      await trx.commit();

      return { success: true };
    } catch (error) {
      trx && (await trx.rollback());
      appInsights.defaultClient.trackException({ exception: error });
      return { success: false, error };
    }
  }

  getEmailTrackingActivityMessage(sender, recipients, ccRecipients, subject) {
    const messageFormatedRecipients = recipients
      .map((row) => `${row.emailAddress.name} &lt;${CustomString(row.emailAddress.address).toCompare()}&gt;`)
      .join(', ');
    const messageFormatedCCRecipients = ccRecipients
      .map((row) => `${row.emailAddress.name} &lt;${CustomString(row.emailAddress.address).toCompare()}&gt;`)
      .join(', ');

    let message = `Created by sending an email from Outlook <br>From: ${sender.name} &lt;${sender.address}&gt; <br>To: ${messageFormatedRecipients}`;
    if (messageFormatedCCRecipients.length > 0) {
      message = `${message} <br>CC: ${messageFormatedCCRecipients}`;
    }
    message = `${message} <br>Subject: ${subject}`;

    return message;
  }

  async validateEmailForTracking(sender, recipients = [], ccRecipients = []) {
    const formatedSender = CustomString(sender).toCompare();
    const formatedRecipients = recipients.map(({ emailAddress }) => CustomString(emailAddress.address).toCompare());
    const formatedCCRecipients = ccRecipients.map(({ emailAddress }) => CustomString(emailAddress.address).toCompare());

    const blockedFromEmails = await Database.table('email_tracking_block_lists')
      .select(['*', Database.raw('LOWER(email) as email')])
      .where(Database.raw('LOWER(email)'), formatedSender)
      .andWhere('block_from', true);

    const allRecipients = [...formatedRecipients, ...formatedCCRecipients];
    const blockedToEmails = await Database.table('email_tracking_block_lists')
      .select(['*', Database.raw('LOWER(email) as email')])
      .whereRaw(`LOWER(email) IN ${joinStringForQueryUsage(allRecipients)}`)
      .andWhere('block_to', true);

    if (blockedFromEmails.length > 0) {
      return {
        success: false,
        message: 'The sender is in our email tracking block list',
        data: blockedFromEmails,
      };
    }

    if (blockedToEmails.length > 0) {
      return {
        success: false,
        message: 'One recipient is in our email tracking block list',
        data: blockedToEmails,
      };
    }

    return { success: true };
  }

  async createInventoryMailActivity(activityMessage, recipients = [], userId, microsoftMailId, trx) {
    if (recipients.length <= 0) return null;

    const CandidateRepository = new (use('App/Helpers/CandidateRepository'))(); //To not cause JSON infinite circle bug
    const HiringAuthorityRepository = new (use('App/Helpers/HiringAuthorityRepository'))();
    const NameRepository = new (use('App/Helpers/NameRepository'))();

    const [candidatesFound, hiringAuthoritiesFound, namesFound] = await this.findInventory(recipients);

    const optionalParams = { externalTrx: trx, createdBySystem: true, metadata: { microsoftMailId } };

    const candidatesActivitiesPromise = candidatesFound.map((candidate) => {
      return CandidateRepository.createActivityLog(
        activityMessage,
        activityLogTypes.Email,
        candidate.id,
        userId,
        optionalParams
      );
    });

    const haActivitiesPromise = hiringAuthoritiesFound.map((hiringAuthority) => {
      return HiringAuthorityRepository.createActivityLog(
        activityMessage,
        activityLogTypes.Email,
        hiringAuthority.id,
        userId,
        optionalParams
      );
    });

    const namesActivitiesPromise = namesFound.map((name) => {
      return NameRepository.createActivityLog(activityMessage, activityLogTypes.Email, name.id, userId, optionalParams);
    });

    await Promise.all(candidatesActivitiesPromise);
    await Promise.all(haActivitiesPromise);
    await Promise.all(namesActivitiesPromise);
  }

  async findInventory(recipients) {
    const emails = recipients.map((row) => CustomString(row.emailAddress.address).toCompare());

    const contactsFound = await Database.table('contacts_directory')
      .select(['origin_table_id as id', 'role_id', 'email'])
      .whereRaw(`LOWER(email) IN ${joinStringForQueryUsage(emails)}`);

    const candidates = [];
    const hirings = [];
    const names = [];

    for (const contact of contactsFound) {
      switch (Number(contact.role_id)) {
        case nameTypes.Name:
          names.push(contact);
          break;

        case nameTypes.Candidate:
          candidates.push(contact);
          break;

        case nameTypes.HiringAuthority:
          hirings.push(contact);
          break;
      }
    }

    return [candidates, hirings, names];
  }

  async sendOnBehalfMail(userId, sendMail, config) {
    const userAllowedOnBehalf = await this.isUserAllowedOnBehalfUsage(userId);
    if (!userAllowedOnBehalf.success) return userAllowedOnBehalf;

    sendMail.message.from = {
      emailAddress: {
        address: config.onBehalf,
      },
    };

    const clientOnBehalf = await this.getOnBehalfClient();
    if (!clientOnBehalf) {
      return {
        success: false,
        message: Antl.formatMessage('messages.error.microsoftgraph.genericOnBehalfError'),
        code: 500,
      };
    }

    const { id: microsoftUserId } = await clientOnBehalf.api(`/users/${config.onBehalf}`).get();

    const eventConfig = {
      email: config.onBehalf,
      operation: OperationType.MicrosoftGraph.SentOnBehalfEmail,
    };

    const response = await clientOnBehalf.api(`/users/${microsoftUserId}/sendMail`).post(sendMail);

    return { success: true, data: { response, eventConfig } };
  }

  async sendOwnMail(client, sendMail) {
    const { mail } = await client.api(`/me`).get();

    const eventConfig = {
      email: mail,
      operation: OperationType.MicrosoftGraph.SentEmail,
    };

    const response = await client.api('/me/sendMail').post(sendMail);

    return { success: true, data: { response, eventConfig } };
  }

  async isUserAllowedOnBehalfUsage(userId) {
    const { hasAtLeastOne } = await UserRepository.hasRoles(userId, [
      userRoles.Coach,
      userRoles.RegionalDirector,
      userRoles.Operations,
    ]);

    if (hasAtLeastOne) return { success: true };

    return {
      success: false,
      code: 403,
      message: Antl.formatMessage('messages.error.microsoftgraph.forbiddenOnBehalf'),
    };
  }

  /**
   * Logs an action by Microsoft Graph
   *
   * @method logChange
   *
   * @description Use this whenever an action is used in Microsoft Graph
   *
   * @param {Number} email - The email that was used for the action (e.g.: The sender)
   * @param {String} entity - What was the entity action
   * @param {String} operation - Related operation (create, update, delete)
   * @param {Object} payload - Content of the changed object
   * @param {Number} userId - Who made the change
   */
  async logChange(email, entity, operation, payload, userId) {
    try {
      await MicrosoftGraphChangeLog.create({
        email,
        entity,
        operation,
        payload,
        created_by: userId,
      });
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  }
}

module.exports = MicrosoftGraph;
