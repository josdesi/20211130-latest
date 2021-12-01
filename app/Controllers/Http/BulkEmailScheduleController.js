'use strict';

/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */
/** @typedef {import('@adonisjs/framework/src/View')} View */

//Repositories
const BulkEmailScheduleRepository = new (use('App/Helpers/BulkEmailScheduleRepository'))();

/**
 * Resourceful controller for interacting with bulkemailschedules
 */
class BulkEmailScheduleController {
  /**
   * Show a list of all bulkemailschedules.
   * GET bulk-emails-schedules
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {View} ctx.view
   */
  async index({ request, auth, response }) {
    const result = await BulkEmailScheduleRepository.listing(request.all(), auth.current.user.id);

    return response.status(result.code).send(result.success ? result.data : result);
  }

  /**
   * Create/save a new bulkemailschedule.
   * POST bulk-emails-schedules
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async store({ auth, request, response }) {
    const emailData = request.only([
      'search_project_id',
      'block_resend',
      'block_duration_days',
      'subject',
      'text',
      'html',
      'email_template_id',
      'bulk_email_scope_type_id',
      'draft_id',
      'files',
      'attachment_template_block_list',
      'send_date',
      'block_similar_companies',
    ]);
    const candidateIds = request.input('candidate_ids');
    const jobOrderIds = request.input('job_order_ids');

    const result = await BulkEmailScheduleRepository.create(emailData, auth.current.user.id, candidateIds, jobOrderIds);

    return response.status(result.code).send(result.success ? result.data : result);
  }

  /**
   * Display a single bulkemailschedule.
   * GET bulk-emails-schedules/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {View} ctx.view
   */
  async show({ params, auth, request, response }) {
    const result = await BulkEmailScheduleRepository.details(params.id, auth.current.user.id);

    return response.status(result.code).send(result.success ? result.data : result);
  }

  /**
   * Update bulkemailschedule details.
   * PUT or PATCH bulk-emails-schedules/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async update({ params, auth, request, response }) {
    const emailData = request.only(['search_project_id', 'block_resend', 'block_duration_days']);
    const emailBodyData = request.only(['subject', 'text', 'html']);
    const { files } = request.only(['files']);

    const result = await BulkEmailScheduleRepository.update(
      params.id,
      emailData,
      emailBodyData,
      files,
      auth.current.user.id
    );

    return response.status(result.code).send(result.success ? result.data : result);
  }

  /**
   * Update bulkemailschedule details.
   * PUT or PATCH bulk-emails-schedules/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async updateSendDate({ params, auth, request, response }) {
    const result = await BulkEmailScheduleRepository.updateSendDate(params.id, request.all(), auth.current.user.id);

    return response.status(result.code).send(result.success ? result.data : result);
  }

  /**
   * Delete a bulkemailschedule with id.
   * DELETE bulk-emails-schedules/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async destroy({ params, auth, request, response }) {
    const result = await BulkEmailScheduleRepository.destroy(params.id, auth.current.user.id);

    return response.status(result.code).send(result.success ? result.data : result);
  }

  /**
   * Delete a bulkemailschedule attachment with id.
   * DELETE bulkemailschedules/attachment/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async destroyAttachment({ params, auth, request, response }) {
    const result = await BulkEmailScheduleRepository.destroyAttachment(params.id, request.all(), auth.current.user.id);

    return response.status(result.code).send(result.success ? result.data : result);
  }
}

module.exports = BulkEmailScheduleController;
