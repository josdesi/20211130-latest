'use strict';

const sgClient = require('@sendgrid/client');
const appInsights = require('applicationinsights');

class SendgridEmailValidationService {
  constructor(Config) {
    try {
      sgClient.setApiKey(Config.get('sendgrid.emailValidationApiKey'));
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  }

  /**
   * Validate the email & returns the whole response
   *
   * @param {Array} email
   *
   * @return {Object} { statusCode, body, headers }
   */
  async validateEmail(email, source = 'signup') {
    try {
      const request = {
        method: 'POST',
        url: '/v3/validations/email',
        body: {
          email: email,
          source: source,
        },
      };

      const [response] = await sgClient.request(request);
      return response;
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      const code = error.code ? error.code : error.statusCode;
      const message = error.message ? error.message : '';

      if (error.response) {
        return { ...error.response, statusCode: code, message };
      }

      return {
        success: false,
        statusCode: code ? code : 500,
        message: error.message ? error.message : 'Could not use sendgrid to validate the email',
      };
    }
  }
}

module.exports = SendgridEmailValidationService;
