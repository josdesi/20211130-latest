'use strict';

/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */
/** @typedef {import('@adonisjs/framework/src/View')} View */

const appInsights = require("applicationinsights");
const { auditFields } = use('App/Helpers/Globals');
const JobOrderSourceType = use('App/Models/JobOrderSourceType');
const Antl = use('Antl');
/**
 * Resourceful controller for interacting with sourcetypes
 */
class JobOrderSourceTypeController {
  /**
   * Show a list of all sourcetypes.
   * GET sourcetypes
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {View} ctx.view
   */
  async index({ response }) {
    try {
      const sourceTypes = await JobOrderSourceType.query()
        .setHidden(auditFields)
        .orderBy('title')
        .fetch();

      return response.ok(sourceTypes);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return response.status(500).send({
        message: Antl.formatMessage('messages.error.internalServer', {
          action: 'retrieving',
          entity: 'source types',
        }),
      });
    }

  }
}

module.exports = JobOrderSourceTypeController;
