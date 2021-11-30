'use strict';

/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */

//Repositories
const RoleRepository = new (use('App/Helpers/RoleRepository'))();

/**
 * Controller for interacting with roles
 */
class RoleController {
  /**
   * Show all roles based on filters
   * GET roster
   *
   * @param {object} ctx.auth
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async indexByFilter({ request, response }) {
    const params = request.only(['filter']);
    const result = await RoleRepository.listing(params);

    return response.status(result.code).send(result.success ? result.data : result);
  }
}

module.exports = RoleController;
