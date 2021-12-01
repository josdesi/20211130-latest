'use strict';

/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */

//Repositories
const EmailTrackingBlockListRepository = new (use('App/Helpers/EmailTrackingBlockListRepository'))();

/**
 * Resourceful controller for interacting with emailtrackingblocklists
 */
class EmailTrackingBlockListController {
  /**
   * Show a list of all emailtrackingblocklists.
   * GET emailtrackingblocklists
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async index({ request, response }) {
    const filters = request.only(['userId', 'blockTo', 'blockFrom', 'usersId']);
    const paginationData = request.only(['page', 'perPage', 'orderBy', 'direction']);
    const keyword = request.input('keyword');

    const result = await EmailTrackingBlockListRepository.listing(filters, paginationData, keyword);

    return response.status(result.code).send(result.success ? result.data : result);
  }

  /**
   * Create/save a new emailtrackingblocklist.
   * POST emailtrackingblocklists
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async store({ request, response, auth }) {
    const userId = auth.current.user.id;
    const blockData = request.only(['to', 'from', 'notes']);
    const email = request.input('email');

    const result = await EmailTrackingBlockListRepository.create(email, blockData, userId);

    return response.status(result.code).send(result.success ? result.data : result);
  }

  /**
   * Display a single emailtrackingblocklist.
   * GET emailtrackingblocklists/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async show({ params, request, response }) {}

  /**
   * Update emailtrackingblocklist details.
   * PUT or PATCH emailtrackingblocklists/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async update({ params, request, response }) {}

  /**
   * Delete a emailtrackingblocklist with id.
   * DELETE emailtrackingblocklists/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async destroy({ params, response, auth }) {
    const userId = auth.current.user.id;
    const id = params.id;

    const result = await EmailTrackingBlockListRepository.delete(id, userId);

    return response.status(result.code).send(result.success ? result.data : result);
  }
}

module.exports = EmailTrackingBlockListController;
