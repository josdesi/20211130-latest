'use strict';

//Repositories
const SendgridConfigurationRepository = new (use('App/Helpers/SendgridConfigurationRepository'))();

//Utils
const SendgridService = use('Services/Sendgrid');
const appInsights = require('applicationinsights');

class GenericSendgridTemplateEmail {
  /**
   * Send an email via sendgrid using a specific template id, passing the information already processed
   *
   * @summary This method is expected to be the only of two called in this class, sends an email using sendgrid templates, PLEASE respect the snake_case in the required params, this is due to sendgrid expecting those exact parameters
   *
   * @param {Object[]} recipients - An array of recipients object, each object must containt its neccesary information
   * @param {string} recipients[].to - Recipient's email
   * @param {string} recipients[].dynamic_template_data - Recipient's dynamyc templates, here should be info named AS IS in the sendgrid template handlers, but is not neccesary
   * @param {string=} recipients[].dynamic_template_data.full_name - As an example, if the template has 'Hello {{full_name}}!', each emails will be personalized, with each dynamic_template_data of each recipient
   * @param {Object=} generalDynamicTemplateData - An object containing the sendgrid handlers substitutions, it works like each of the recipients dynamic_template_data, but this one is for data that will be the same across the email, for example a place or something generic
   * @param {string} sendgridConfigurationName -  What sendgrid configuration should be used, this contains the template id & the sender information
   *
   * @return {Object} User activities
   */
  async sendViaConfig(recipients, generalDynamicTemplateData, sendgridConfigurationName, attachments) {
    try {
      const sendgridConfiguration = await SendgridConfigurationRepository.getByType(sendgridConfigurationName);
      if (!sendgridConfiguration) throw `${sendgridConfigurationName} sendgrid configuration not found`;

      const sender = {
        email: sendgridConfiguration.sender,
      };
      if (sendgridConfiguration.sender_name) sender.name = sendgridConfiguration.sender_name;

      const sendgridTemplateId = sendgridConfiguration.template_id;

      const result = await this.send(sender, recipients, sendgridTemplateId, generalDynamicTemplateData, attachments);
      return result;
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        message: error,
      };
    }
  }

  /**
   * Send an email via sendgrid using a specific template id, passing the information already processed
   *
   * @summary This method is expected to be the only of two called in this class, sends an email using sendgrid templates, PLEASE respect the snake_case in the required params, this is due to sendgrid expecting those exact parameters
   *
   * @param {Object} sender - This object contains the sender information
   * @param {string} sender.name -  Sender's name
   * @param {string} sender.email - Sender's email
   * @param {Object[]} recipients - An array of recipients object, each object must containt its neccesary information
   * @param {string} recipients[].to - Recipient's email
   * @param {string} recipients[].dynamic_template_data - Recipient's dynamyc templates, here should be info named AS IS in the sendgrid template handlers, but is not neccesary
   * @param {string=} recipients[].dynamic_template_data.full_name - As an example, if the template has 'Hello {{full_name}}!', each emails will be personalized, with each dynamic_template_data of each recipient
   * @param {string} sendgridTemplateId -  Sendgrid template id
   * @param {Object=} generalDynamicTemplateData - An object containing the sendgrid handlers substitutions, it works like each of the recipients dynamic_template_data, but this one is for data that will be the same across the email, for example a place or something generic
   *
   * @return {Object} User activities
   */
  async send(sender, recipients = [], sendgridTemplateId, generalDynamicTemplateData, attachments) {
    try {
      const isInvalid = this.sendMethodValidator(sender, recipients, sendgridTemplateId, generalDynamicTemplateData);
      if (isInvalid) {
        return isInvalid;
      }

      const basicSendgridJSON = this.buildSendgridJSON(recipients, sender, sendgridTemplateId, attachments);

      const advancedSendgridJSON = this.addAdditionalInformation(basicSendgridJSON, generalDynamicTemplateData);

      const sendgridResponse = await SendgridService.send(advancedSendgridJSON);

      return {
        success: !!(sendgridResponse && sendgridResponse.length && sendgridResponse[0].statusCode === 202),
        sendgridResponse,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        message: error,
      };
    }
  }

  /**
   * Builds the sendgrid JSON with the neccesary information to be a working sendgrid JSON
   *
   * @summary This method add the bare minumium that sendgrid asks, like the personalizations (recipients), sender information & the template id
   *
   * @param {Object} recipients - An object that contains the recipients information already personalized
   * @param {Object} sender - An object that contains the sender information
   * @param {String} sendgridTemplateId - The template id that sendgrid will be using
   *
   * @return {Object} basic sendgrid JSON
   */
  buildSendgridJSON(recipients, sender, sendgridTemplateId, attachments = []) {
    return {
      personalizations: recipients,
      from: sender,
      templateId: sendgridTemplateId,
      attachments,
    };
  }

  /**
   * Adds additional information to the sendgrid JSON built beforehand
   *
   * @summary This method aims to add additional information (not neccesary) like generic template data, attachments*, cc* or other extra parameters* (pending, asked on demand, should be implemented here as long as it does not interferes with the basic usability/implementations)
   *
   * @param {Object} basicSendgridJSON - A sendgrid JSON already filled with basic information
   * @param {Object} generalDynamicTemplateData - An object that contains the extra handlers that every email will be using
   *
   * @return {Object} advanced sendgrid JSON
   */
  addAdditionalInformation(basicSendgridJSON, generalDynamicTemplateData) {
    if (generalDynamicTemplateData && Object.keys(generalDynamicTemplateData).length > 0) {
      basicSendgridJSON.dynamic_template_data = generalDynamicTemplateData;
    }

    return basicSendgridJSON;
  }

  /**
   * Validates that the information passed is valid
   *
   * @summary This methods checks if the arguments are well formed, just to decrease misunderstandment
   *
   * @param {Object} sender - This object contains the sender information
   * @param {Object[]} recipients - An array of recipients object, each object must containt its neccesary information
   * @param {string} sendgridTemplateId -  Sendgrid template id
   * @param {Object} generalDynamicTemplateData - An object containing the sendgrid handlers substitutions, it works like each of the recipients dynamic_template_data, but this one is for data that will be the same across the email, for example a place or something generic
   *
   * @return {Strin|Boolean} Wether is invalid or not
   */
  sendMethodValidator(sender, recipients, sendgridTemplateId, generalDynamicTemplateData) {
    if (!sender || !sender.email) {
      return 'The sender is malformed';
    }

    if (recipients.length <= 0 || !recipients[0].to) {
      return 'The recipients are malformed';
    }

    if (!sendgridTemplateId) {
      return 'The sendgrid template id is malformed';
    }

    if (typeof generalDynamicTemplateData !== 'object' && generalDynamicTemplateData !== null) {
      return 'the generic dynamic template data is malformed';
    }

    return false;
  }
}

module.exports = GenericSendgridTemplateEmail;
