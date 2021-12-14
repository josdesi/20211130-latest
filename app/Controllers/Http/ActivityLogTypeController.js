'use strict'

const { auditFields } = use('App/Helpers/Globals');
const ActivityLogType = use('App/Models/ActivityLogType');
const appInsights = require("applicationinsights");
/**
 * Resourceful controller for interacting with sourcetypes
 */
class ActivityLogTypeController {
      /**
   * Show a list of all activitylogtypes.
   * GET sourcetypes
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {View} ctx.view
   */
  async index({ response }) {
    try {
      const activityLogTypes = await ActivityLogType.query()
        .where('available', 1)
        .setHidden(auditFields)
        .orderBy('title')
        .fetch();

      return response.ok(activityLogTypes);
    } catch (error) {
      appInsights.defaultClient.trackException({exception: error});

      return response.status(500).send({
        message: 'There was a problem getting the Activity Log Types, please try again later'
      });
    }

  }
}

module.exports = ActivityLogTypeController
