'use strict';

/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */
/** @typedef {import('@adonisjs/framework/src/View')} View */

const appInsights = require("applicationinsights");
const { auditFields } = use('App/Helpers/Globals');
const SourceType = use('App/Models/SourceType');
/**
 * Resourceful controller for interacting with sourcetypes
 */
class SourceTypeController {
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
      const sourceTypes = await SourceType.query()
        .setHidden(auditFields)
        .orderBy('title')
        .fetch();

      return response.ok(sourceTypes);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return response.status(500).send({
        message: 'There was a problem retrieving the SourceTypes, please try again later' 
      });
    }

  }
}

module.exports = SourceTypeController;
