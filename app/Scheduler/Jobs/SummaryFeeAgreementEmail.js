//Utils
const { JobNames } = use('App/Scheduler/Constants');
const moment = use('moment');
const appInsights = require('applicationinsights');
const SummaryFeeAgreementEmail = new (use('App/Emails/SummaryFeeAgreementEmail'))();

module.exports = (agenda) => {
  agenda.define(JobNames.Emails.SummaryFeeAgreementEmail, async (job) => {
    try {
      const startDate = moment().subtract(1, 'days').format();
      const endDate = moment().format();

      await SummaryFeeAgreementEmail.send(startDate, endDate);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  });
};
