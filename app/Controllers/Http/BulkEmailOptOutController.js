'use strict';

/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */
/** @typedef {import('@adonisjs/framework/src/View')} View */

//Repositories
const BulkEmailOptOutRepository = new (use('App/Helpers/BulkEmailOptOutRepository'))();

/**
 * Resourceful controller for interacting with bulkemailoptouts
 */
class BulkEmailOptOutController {
  /**
   * Show a list of all bulkemailoptouts.
   * GET bulk-emails-opt-outs
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {View} ctx.view
   */
  async index({ request, auth, response }) {
    const result = await BulkEmailOptOutRepository.listing(request.all(), auth.current.user.id);

    return response.status(result.code).send(result.success ? result.data : result);
  }

  /**
   * Show a list of all bulkemailoptouts types.
   * GET bulk-emails-opt-outs
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {View} ctx.view
   */
  async indexTypes({ request, auth, response }) {
    const result = await BulkEmailOptOutRepository.listingTypes();

    return response.status(result.code).send(result.success ? result.data : result);
  }

  /**
   * Show a list of all bulkemailoptouts reasons.
   * GET bulk-emails-opt-outs/reasons
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {View} ctx.view
   */
  async indexReasons({ request, auth, response }) {
    const allReasons = request.input('all_reasons');
    const result = await BulkEmailOptOutRepository.getRecruitersReasons(allReasons);

    return response.status(result.code).send(result.success ? result.data : result);
  }

  /**
   * Show a list of all users that has at least one opt out created & active
   * GET bulk-emails-opt-outs/users
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {View} ctx.view
   */
  async indexRecruiters({ request, auth, response }) {
    const result = await BulkEmailOptOutRepository.getOptOutRecruiters();

    return response.status(result.code).send(result.success ? result.data : result);
  }

  /**
   * Search possibles emails/full_names that are available to put in a opt out
   * GET bulk-emails-opt-outs/search
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {View} ctx.view
   */
  async search({ request, auth, response }) {
    const result = await BulkEmailOptOutRepository.searchPossibleEmails(request.all());

    return response.status(result.code).send(result.success ? result.data : result);
  }

  /**
   * Create/save a new bulkemailoptout.
   * POST bulk-emails-opt-outs
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async store({ auth, request, response }) {
    const optOutData = request.only([
      'item_id',
      'email_opt_out_type_id',
      'unsubscribe_reason_id',
      'custom_reason',
      'notes',
      'manual_email',
    ]);
    const userId = auth.current.user.id;

    let result = null;
    if (optOutData.manual_email) {
      result = await BulkEmailOptOutRepository.createUnsubscribeFromFortpac(optOutData, userId);
    } else {
      result = await BulkEmailOptOutRepository.create(optOutData, userId);
    }

    return response.status(result.code).send(result.success ? result.data : result);
  }

  /**
   * Create/save a new bulkemailoptout generated from the user.
   * POST bulk-unsubscribe
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async storeUnsubscribe({ request, response }) {
    const unsubscribeData = request.only(['email', 'email_history_id', 'unsubscribe_reason_id', 'custom_reason']);

    const result = await BulkEmailOptOutRepository.createUnsubscribe(unsubscribeData);

    return response.status(result.code).send(result.success ? result.data : result);
  }

  /**
   * Delete a bulkemailoptout with id.
   * DELETE bulk-emails-opt-outs/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async destroy({ params, auth, request, response }) {
    const userId = auth.current.user.id;
    const isUnsubscribe = this.stringToBoolean(request.input('is_unsubscribe', ''));
    const result = await BulkEmailOptOutRepository.destroy(params.id, userId, isUnsubscribe);

    return response.status(result.code).send(result.success ? result.data : result);
  }

  stringToBoolean(string) {
    return /true/i.test(string);
  }
}

module.exports = BulkEmailOptOutController;
