'use strict';

/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */

//Models
const Permission = use('App/Models/Permission');

//Utils
const appInsights = require('applicationinsights');

/**
 * Controller for interacting with roles
 */
class PermissionController {
    /**
   * Show all permissions based on filters
   * GET permissions
   *
   * @param {object} ctx.auth
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async index({ response }) {
    try {
      const permissions = await Permission.all();

      return response.ok(permissions)
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return response.status(500).send({
        message: 'There was a problem retrieving the users permissions'
      });
    }
  }
}

module.exports = PermissionController
