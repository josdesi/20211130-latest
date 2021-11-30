'use strict';

//Models
const EmailHistory = use('App/Models/EmailHistory');

//Repositories

//Utils
const appInsights = require('applicationinsights');

class BulkEmailMetricsRepository {
  /**
   * Returns a bulk email that has been sent & is ready to have metrics
   *
   * @summary This is not on the normal repository because it is expected to have certain different things like checking if it was scheduled,
   * so this method should not be on the other repository to not confuse future programmers
   *
   * @param {Number} bulkEmailId
   * @param {Number} userId
   *
   * @return {Object} bulk email found
   *
   */
  async getBulkEmailSent(bulkEmailId, userId) {
    try {
      const bulkEmail = await EmailHistory.query()
        .sendgridSuccessEvents()
        .sendgridFailuresEvents()
        .where({
          id: bulkEmailId,
          created_by: userId,
          is_sent: true,
        })
        .first();

      if (!bulkEmail) {
        return {
          success: false,
          code: 404,
          message: 'The Bulk Email could not be found',
        };
      }

      return {
        success: true,
        code: 200,
        data: bulkEmail,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: 'There was a problem while retrieving the bulk email',
      };
    }
  }
}

module.exports = BulkEmailMetricsRepository;
