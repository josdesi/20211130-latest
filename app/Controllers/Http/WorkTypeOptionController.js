'use strict'
const WorkTypeOption = use('App/Models/WorkTypeOption');
const appInsights = require("applicationinsights");
class WorkTypeOptionController {
  /**
   * Show a list of all locations.
   * GET locations
   *
   * @param {object} ctx
   * @param {Response} ctx.response
   */
  async index({ response }) {
    try {
      const workTypeOptions = await WorkTypeOption.query()
        .setHidden(['updated_at', 'created_at'])
        .orderBy('id', 'asc')
        .fetch();

      return response.ok(workTypeOptions);
    } catch (err) {
      appInsights.defaultClient.trackException({ exception: err });

      return response.status(500).send({
        message:"There was a problem getting all the work type options!"
      });
    }
  }
}

module.exports = WorkTypeOptionController
