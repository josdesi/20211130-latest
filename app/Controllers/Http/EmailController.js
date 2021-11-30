'use strict';

//Repositories
const Services = new (use('App/Helpers/Services'))();

//Models
const SendgridEmailValidation = use('App/Models/SendgridEmailValidation');

//Utils
const appInsights = require('applicationinsights');

/**
 * Resourceful controller for interacting with email methods
 */
class EmailController {
  /**
   * Validate if the email is valid.
   * POST email/validate
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async storeEmailValidation({ request, auth, response }) {
    const { email } = request.all();
    const storeEmail = true;

    try {
      const result = await Services.validateEmail(email, storeEmail);

      return response.status(result.code).send(result);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: 'There was a problem while validating the email',
      };
    }
  }
}

module.exports = EmailController;
