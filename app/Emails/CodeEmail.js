'use strict';

//Repositories
const SendgridConfigurationRepository = new (use('App/Helpers/SendgridConfigurationRepository'))();

//Utils
const SendgridService = use('Services/Sendgrid');
const appInsights = require('applicationinsights');

class CodeEmail {
  /**
   *
   * @param {Date} startDate
   * @param {Date} endDate
   *
   * @return {void}
   */
  async send(code, name, recipient) {
    try {
      const type = 'code';

      const personalizations = this.buildEmailPersonalizations(code, name, recipient);
      const sendgridJSON = await this.buildNotificationSendgridJSON(personalizations, type);

      return await SendgridService.send(sendgridJSON);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  }

  buildEmailPersonalizations(code, name, recipient) {
    return [
      {
        to: recipient,
        dynamic_template_data: {
          name: name,
          code: code,
        },
      },
    ];
  }

  async buildNotificationSendgridJSON(personalizations, type) {
    const SendgridConfiguration = await SendgridConfigurationRepository.getByType(type);

    if (!SendgridConfiguration) {
      throw `Sendgrid configuration not found: ${type}`;
    }

    return {
      personalizations,
      from: SendgridConfiguration.sender,
      templateId: SendgridConfiguration.template_id,
    };
  }
}

module.exports = CodeEmail;
