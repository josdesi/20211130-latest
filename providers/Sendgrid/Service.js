'use strict';

const sgMail = require('@sendgrid/mail');
const appInsights = require('applicationinsights');

class SendgridService {
  constructor(Config) {
    try {
      sgMail.setApiKey(Config.get('sendgrid.apiKey'));
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return error;
    }
  }

  /**
   * So, when a sendgrid request is successfully done, a statusCode is returned, but somehow if it fails, it returns a code now... yeah not the best consistency
   *
   * @description Sendgrid responses are inside an array, while I dont agree with them, for consistency, the error shall be returned inside an array too
   *
   * @param {Object} error
   *
   * @return {Object} formatedError
   */
  formatSendgridError(error) {
    try {
      const code = error.code ? error.code : error.statusCode;
      return [
        {
          success: false,
          statusCode: code ? code : 500,
          message: error.message ? error.message : 'Something went wrong while using the Sendgrid service',
        },
      ];
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return error;
    }
  }

  /**
   * Send multiple emails to multiple users.
   * Each recipent cannot see each other
   *
   * @param {Array} emailData
   *
   * @return {void}
   */
  async sendEmailsToUsers(emailData) {
    try {
      const isMultiple = true;
      return sgMail.send(emailData, isMultiple);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return error;
    }
  }

  /**
   * Send ONE email to multiple users.
   *
   * @param {Array} emailData
   *
   * @return {void}
   */
  async sendBulkEmailToUsers(emailData) {
    try {
      return await sgMail.sendMultiple(emailData);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return this.formatSendgridError(error);
    }
  }

  /**
   * Simple send email, one email to one user
   *
   * @param {Array} emailData
   *
   * @return {void}
   */
  async send(emailData) {
    try {
      return await sgMail.send(emailData);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return this.formatSendgridError(error);
    }
  }

  /**
   * Returns the recipients/emails in a group suppresion
   *
   * @param {Number} suppressionGroupId - The sendgrid suppresion group id
   *
   * @return {Object} response
   */
  async getGroupSuppression(suppressionGroupId) {
    try {
      const request = {
        method: 'GET',
        url: `/v3/asm/groups/${suppressionGroupId}/suppressions`,
      };
      const [response] = await sgMail.client.request(request);
      return response;
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      const code = error.code ? error.code : error.statusCode;
      return {
        success: false,
        statusCode: code ? code : 500,
        message: error.message ? error.message : 'Could not use sendgrid to get the suppression group',
      };
    }
  }
}

module.exports = SendgridService;
