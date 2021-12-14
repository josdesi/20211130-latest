'use strict';

/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */

//Models
const User = use('App/Models/User');
const Attachment = use('App/Models/Attachment');

//Utils
const appInsights = require('applicationinsights');
const MicrosoftGraph = new (use('App/Helpers/MicrosoftGraph'))();
const GenericSendgridTemplateEmail = new (use('App/Emails/GenericSendgridTemplateEmail'))();

class ExampleController {
  /**
   * Kitchensink of sendgrid generic template class' implementation
   *
   * @summary In this example, an email in sent in which, a custom sender is used, the recipients have template data, and generic template data is used
   */
  async sendgridGenericTemplateExample({ response, auth }) {
    try {
      const userId = auth.current.user.id;

      const userInformation = (
        await User.query()
          .where('id', userId)
          .with('personalInformation', (builder) => builder.with('address').with('address.city'))
          .first()
      ).toJSON();

      const sender = {
        name: 'gpac Notifications',
        email: 'notifications@gogpac.com',
      };

      const recipients = [
        {
          to: {
            name: userInformation.personalInformation.full_name,
            email: userInformation.email,
          },
          dynamic_template_data: {
            last_name: userInformation.personalInformation.last_name,
            city: userInformation.personalInformation.address.city.title,
            address: userInformation.personalInformation.address.address,
          },
        }, //So if an email should be sent to more recipients, just add another object to this array!
      ];

      const sendgridTemplateId = 'd-572bab2111b54743a73c8639b40c56c5'; //A simple template example I created in sendgrid

      const generalDynamicTemplateData = {
        industry: 'All recipients will see this same industry...',
        date: 'so instead of adding to each recipient the dynamic_template_data, just add it here!',
      };

      await GenericSendgridTemplateEmail.send(sender, recipients, sendgridTemplateId, generalDynamicTemplateData);

      return response.status(200).send({ message: 'An email has been just sent!👀' });
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return response.status(500).send({ message: 'Something went wrong' });
    }
  }

  /**
   * Sendgrid generic template class' implementation using a configuration
   *
   * @summary In this example, Instead of passing the template id & the sender, a configuration can be used, allowing quick changes if the template or sender changes in the future
   */
  async sendgridGenericTemplateViaConfigurationExample({ response, auth }) {
    try {
      const userId = auth.current.user.id;

      const userInformation = (
        await User.query()
          .where('id', userId)
          .with('personalInformation', (builder) => builder.with('address').with('address.city'))
          .first()
      ).toJSON();

      const recipients = [
        {
          to: {
            name: userInformation.personalInformation.full_name,
            email: userInformation.email,
          },
          dynamic_template_data: {
            last_name: userInformation.personalInformation.last_name,
            city: userInformation.personalInformation.address.city.title,
            address: userInformation.personalInformation.address.address,
          },
        }, //So if an email should be sent to more recipients, just add another object to this array!
      ];

      const generalDynamicTemplateData = {
        industry: 'All recipients will see this same industry...',
        date: 'so instead of adding to each recipient the dynamic_template_data, just add it here!',
      };

      const sendgridConfigurationName = 'fee_agreement_InsertHereTheSpecificOne'; //Instead of creating the sender & the template, a configuration can be made in the database...
      //... (sendgrid_configurations) & the method sendViaConfig() can be used

      const result = await GenericSendgridTemplateEmail.sendViaConfig(
        recipients,
        generalDynamicTemplateData,
        sendgridConfigurationName
      );

      if (!result.success) return response.status(500).send({ message: 'Something went wrong 🤠', data: result });

      return response.status(200).send({ message: 'An email has been just sent!👀' });
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return response.status(500).send({ message: 'Something went wrong' });
    }
  }

  /**
   * Microsoft graph mailing, using outlook of course
   *
   * @summary In this example, Instead of using Sendgrid as we usually do, now we are sending a mail via Microsoft Graph
   */
  async sendOutlookEmail({ response, auth, request }) {
    try {
      const userId = auth.current.user.id;

      const userInformation = (
        await User.query()
          .where('id', userId)
          .with('personalInformation', (builder) => builder.with('address').with('address.city'))
          .first()
      ).toJSON();

      const recipients = request.input('recipients', []);
      const ccRecipients = request.input('ccRecipients', []);
      const bccRecipients = request.input('bccRecipients', []);
      const onBehalfEmail = request.input('onBehalfEmail', null);

      const subject = 'Hello there, from Fortpac, using Microsoft Graph!';
      const body = {
        contentType: 'Text', //or Html
        content: `Hi! My name is ${userInformation.personalInformation.full_name} & I just sent this email using Fortpac Demo!!!`,
      };

      const testAttachment = await Attachment.query().whereNotNull('url').orderBy('id', 'desc').first();
      const azureBlobPath = testAttachment.url;
      const fileName = testAttachment.name;

      const attachments = {
        raw: [
          {
            name: 'attachment.txt',
            contentType: 'text/plain',
            contentBytes: 'SGVsbG8gV29ybGQh',
          },
          {
            name: 'attachment2.txt',
            contentType: 'text/plain',
            contentBytes: 'SGVsbG8gV29ybGQh',
          },
        ],
        azureBlobs: [{ name: fileName, url: azureBlobPath }],
      };

      //Needed arguments for the sendEmail method
      const recipientData = {
        recipients,
        ccRecipients,
        bccRecipients,
      };
      const messageData = {
        subject,
        body,
      };
      const config = {
        saveToSentItems: 'true', //This allows the user to see the email in their outbound mailing box
      };

      if (onBehalfEmail) config.onBehalf = onBehalfEmail; //Watch out for this, only coaches should be able to use this, still our company policy will throw an Error

      const emailResponse = await MicrosoftGraph.sendEmail(recipientData, messageData, config, userId, attachments);

      if (!emailResponse.success) return response.status(500).send(emailResponse);

      return response.status(200).send({ message: 'An email has been just sent!👀' });
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return response.status(500).send({ message: 'Something went wrong' });
    }
  }
}

module.exports = ExampleController;
