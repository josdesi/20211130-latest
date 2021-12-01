'use strict';
//Repositories
const EmailRepository = new (use('App/Helpers/EmailRepository'))();

//Utils
const appInsights = require('applicationinsights');
const ActivityAgenda = use('Services/ActivityAgenda');
const { JobNames } = use('App/Scheduler/Constants');

const BulkEmail = (module.exports = {
  /**
   * Schedule the bulk email to be sent later
   *
   * @method
   *
   * @param {Integer} jobOrderId
   *
   */
  schedule: async ({ bulkEmailId, date, userId }) => {
    try {
      await ActivityAgenda.create(JobNames.Emails.ScheduledBulkEmail, {
        bulkEmailId,
        date,
        userId,
      })
        .schedule(date)
        .save();

      //Kevin alert
      //If something goes wrong when saving the scheduling, perhaps a alert could be send? but how do I know agenda failed? the response doesn't seem to return a code
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },
  /**
   * Delete a scheduled bulk email
   *
   * @method
   *
   * @param {Integer} jobOrderId
   *
   */
  delete: async ({ bulkEmailId, date, userId }) => {
    try {
      await ActivityAgenda.cancel({
        name: JobNames.Emails.ScheduledBulkEmail,
        'data.bulkEmailId': bulkEmailId,
        'data.userId': userId,
      });

      //Kevin alert
      //If something goes wrong when deleting the scheduling, perhaps a alert could be send? but how do I know agenda failed? the response doesn't seem to return a code
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },
  /**
   * Update a scheduled bulk email
   *
   * @method
   *
   * @param {Integer} jobOrderId
   *
   */
  update: async ({ bulkEmailId, date, userId }) => {
    try {
      await BulkEmail.delete({ bulkEmailId, date, userId });

      await BulkEmail.schedule({ bulkEmailId, date, userId });

      //Kevin alert
      //If something goes wrong when updating the scheduling, perhaps a alert could be send? but how do I know agenda failed? the response doesn't seem to return a code
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },
  /**
   * Notify the user the bulk has been successfully sent
   *
   * @param {Integer} userId
   * @param {Integer} searchProjectId
   */
  notifyUserBulkSent: async ({ userId, searchProjectId }) => {
    try {
      await EmailRepository.notifyUserBulkSent(userId, searchProjectId);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },
});
