//Utils
const { JobNames } = use('App/Scheduler/Constants');
const appInsights = require('applicationinsights');
const BulkEmailScheduleRepository = new (use('App/Helpers/BulkEmailScheduleRepository'))();

module.exports = (agenda) => {
  agenda.define(JobNames.Emails.ScheduledBulkEmail, async (job) => {
    try {
      const { bulkEmailId, userId } = job.attrs.data;
      await BulkEmailScheduleRepository.send(bulkEmailId, userId);
      
      //Here I should check the response, if something went wrong I should alert the user
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  });
};
