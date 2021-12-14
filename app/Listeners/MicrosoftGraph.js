'use strict';

//Utils
const appInsights = require('applicationinsights');

//Repositories
const MicrosoftGraphHelper = new (use('App/Helpers/MicrosoftGraph'))();
const MicrosoftGraph = {
  /**
   * Logs a Microsoft Graph action
   *
   * @description Use this whenever an action is used in the Microsoft Graph Helper & is deemed important
   *
   *
   * @param {Number} email - The email that was used for the action (e.g.: The sender)
   * @param {String} entity - What was the entity action
   * @param {String} operation - Related operation (create, update, delete)
   * @param {Object} payload - Content of the changed object
   * @param {Number} userId - Who made the change
   */
  logChange: async ({ email, entity, operation, payload, userId }) => {
    try {
      await MicrosoftGraphHelper.logChange(email, entity, operation, payload, userId);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },

  /**
   * Stores an email obtained from the Microsoft Graph Subscription
   *
   * @description The mails obtained from the subscription should be stored & create an activity onto the recipients and ccRecipients, under the sender (recruiter)
   *
   * @param {String} emailPayload.conversationId - The conversation id, helps to identify to which thread the mail belongs
   * @param {String} emailPayload.conversationId - The mail id, helps to identify the uniq email
   * @param {String} emailPayload.sender - Who sent the email
   * @param {String} emailPayload.subject - The mail subject
   * @param {Object[]} emailPayload.recipients - The recipients
   * @param {Object[]} emailPayload.ccRecipients - The cc recipients
   *
   */
  storeMail: async (emailPayload) => {
    try {
      const response = await MicrosoftGraphHelper.storeMail(emailPayload);
      if (!response.success) {
        appInsights.defaultClient.trackEvent({
          name: 'Microsoft Graph Store Email Failed',
          properties: { emailPayload, response },
        });
      }
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },
};

module.exports = MicrosoftGraph;
