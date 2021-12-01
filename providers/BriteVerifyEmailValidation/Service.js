'use strict';

const axios = require('axios').default;
const appInsights = require('applicationinsights');

class BriteVerifyEmailValidationService {
  constructor(Config) {
    try {
      this.apiKey = Config.get('briteVerify.apiKey');
      this.url = Config.get('briteVerify.url');
      this.urlV2 = Config.get('briteVerify.urlV2');
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
  async validateEmail(email) {
    try {
      const request = {
        method: 'POST',
        url: `${this.url}/v1/fullverify`,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `ApiKey: ${this.apiKey}`,
        },
        data: JSON.stringify({
          email: email,
        }),
      };

      const response = await axios(request);
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
        message: error.message ? error.message : 'Could not use BriteVerify to validate the email',
      };
    }
  }

  /**
   * Validate a batch of emails by using brite verify lists
   *
   * @param {String[]} emails - The emails that are about to be verified
   * @param {String} directive - The direective being passed to the API, 'start' will inmediatly launch the list for processing, 'terminate' will abandon the list, and none or '' will let the list open for 15 for any append
   *
   * @return {Object} a response with these params = { status, data, headers }
   */
  async validateEmailsBatch(emails, directive = 'start') {
    try {
      const request = {
        method: 'POST',
        url: `${this.urlV2}/v2/lists`,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `ApiKey: ${this.apiKey}`,
        },
        data: JSON.stringify({
          emails,
          directive,
        }),
      };

      const response = await axios(request);
      return response;
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      if (error.response) return error.response;

      return {
        success: false,
        status: 500,
        error,
        message: error.message ? error.message : 'Could not use BriteVerify to validate the emails batch',
      };
    }
  }

  /**
   * check the status of a email batch list validation
   *
   * @param {String} emailListId - The list id, obtained by POSTing successfully to the bulkValidation endpoint
   *
   * @return {Object} a response with these params = { status, data, headers }
   */
  async getEmailsBatchStatus(emailListId) {
    try {
      const request = {
        method: 'GET',
        url: `${this.urlV2}/v2/lists/${emailListId}`,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `ApiKey: ${this.apiKey}`,
        },
      };

      const response = await axios(request);
      return response;
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      if (error.response) return error.response;

      return {
        success: false,
        status: 500,
        error,
        message: error.message ? error.message : 'Could not use BriteVerify to get the email validation batch status',
      };
    }
  }

  /**
   * get a email validation batch list
   *
   * @param {String} emailListId - The list id, obtained by POSTing successfully to the bulkValidation endpoint
   * @param {Number} page - The page desired to see
   *
   * @return {Object} a response with these params = { status, data, headers }
   */
  async getEmailsBatchList(emailListId, page = 1) {
    try {
      const request = {
        method: 'GET',
        url: `${this.urlV2}/v2/lists/${emailListId}/export/${page}`,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `ApiKey: ${this.apiKey}`,
        },
      };

      const response = await axios(request);
      return response;
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      if (error.response) return error.response;

      return {
        success: false,
        status: 500,
        error,
        message: error.message ? error.message : 'Could not use BriteVerify to get the email validation batch list',
      };
    }
  }
}

module.exports = BriteVerifyEmailValidationService;
