'use strict';

//Repositories
const UserRepository = new (use('App/Helpers/UserRepository'))();
const FeeAgreementRepository = new (use('App/Helpers/FeeAgreementRepository'))();
const SendgridConfigurationRepository = new (use('App/Helpers/SendgridConfigurationRepository'))();

//Utils
const SendgridService = use('Services/Sendgrid');
const appInsights = require('applicationinsights');
const Env = use('Env');

class SummaryFeeAgreementEmail {
  /**
   *  Seends an Email to all active recruiters, the email uses a sendgrid transactional template
   *
   * @param {Date} startDate
   * @param {Date} endDate
   *
   * @return {void}
   */
  async send(startDate, endDate) {
    try {
      const type = 'feeSummaryCount';

      const { signed_count, sent_count } = await this.getFeeCounts(startDate, endDate);

      const emails = await this.getEmails();

      const sendgridJSON = await this.buildSendgridJSON(emails, { signed_count, sent_count }, type);

      await SendgridService.sendEmailsToUsers(sendgridJSON);
      return true;
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  }

  async getFeeCounts(startDate, endDate) {
    const signed_count = await FeeAgreementRepository.getFeeAgreementSignedCount(startDate, endDate);
    const sent_count = await FeeAgreementRepository.getFeeAgreementValidatedCount(startDate, endDate);

    return { signed_count, sent_count };
  }

  async getEmails() {
    return (await UserRepository.getAllActiveRecruiters()).flatMap((row) => {
      if (this.isTestingEmail(row.email) && Env.get('SEND_REAL_USERS') !== 'true') {
        return [];
      }
      return row.email;
    });
  }

  async buildSendgridJSON(emails, { signed_count, sent_count }, type) {
    const SendgridConfiguration = await SendgridConfigurationRepository.getByType(type);
    Env.get('PUBLIC_URL_WEB');
    return {
      to: emails,
      from: SendgridConfiguration.sender,
      templateId: SendgridConfiguration.template_id,
      dynamicTemplateData: {
        signed_count,
        sent_count,
        view_url: `${Env.get('PUBLIC_URL_WEB')}/feeagreements`,
      },
    };
  }

  /**
   * This method was created to filter out any other emails than these,
   *  in production it is expected to be disabled
   */
  isTestingEmail(email) {
    const emails = Env.get('EMAILS_FOR_TESTING').split(',');
    return !emails.includes(email);
  }
}

module.exports = SummaryFeeAgreementEmail;
