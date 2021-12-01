//Utils
const { JobNames } = use('App/Scheduler/Constants');
const moment = use('moment');
const appInsights = require('applicationinsights');
const SummaryEmail = new (use('App/Emails/SummaryEmail'))();

module.exports = agenda => {
  agenda.define(JobNames.Emails.SummaryEmail, async (job) => {
    try {
      //Needs the full string in ISO 8601, format() without args returns the full string
      const startDate = moment().subtract(1, "days").format();
      const endDate = moment().format();
      
      await SummaryEmail.send(startDate, endDate)
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  });
  
};