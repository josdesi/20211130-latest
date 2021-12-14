'use strict';

/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */
/** @typedef {import('@adonisjs/framework/src/View')} View */

//Repositories
const BulkEmailTemplateRepository = new (use('App/Helpers/BulkEmailTemplateRepository'))();

/**
 * Resourceful controller for interacting with bulkemails
 */
class BulkEmailTemplateController {
  /**
   * Show a list of all bulk email templates.
   * GET bulk-emails-templates
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async index({ request, auth, response }) {
    const scopeId = request.input('scopeId');
    const userId = auth.current.user.id
    const result = await BulkEmailTemplateRepository.listing(request.all(), userId, scopeId);

    return response.status(result.code).send(result.success ? result.data : result);
  }

  /**
   * Show a list of all availables smartags to use in the bulk body.
   * GET smartags
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async indexSmartags({ request, auth, response }) {
    const result = await BulkEmailTemplateRepository.listingSmartags();

    return response.status(result.code).send(result.success ? result.data : result);
  }

  /**
   * Show a list of all yours bulk emails templates.
   * GET bulk-emails-templates
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async indexFolder({ request, auth, response }) {
    const result = await BulkEmailTemplateRepository.listingFolders(auth.current.user.id);

    return response.status(result.code).send(result.success ? result.data : result);
  }

  /**
   * Create  a new bulk email template.
   * POST bulk-emails-templates
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async store({ auth, request, response }) {
    const templateData = request.only([
      'name',
      'parent_folder_id',
      'subject',
      'text',
      'html',
      'files',
      'bulk_email_scope_type_id',
    ]);

    const result = await BulkEmailTemplateRepository.create(templateData, auth.current.user.id);

    return response.status(result.code).send(result.success ? result.data : result);
  }

  /**
   * Create a new bulk email template folder.
   * POST bulk-emails-templates/folder
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async storeFolder({ auth, request, response }) {
    const result = await BulkEmailTemplateRepository.createFolder(request.all(), auth.current.user.id);

    return response.status(result.code).send(result.success ? result.data : result);
  }

  /**
   * Display a single bulk email template.
   * GET bulk-emails-templates/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async show({ params, auth, request, response }) {
    const result = await BulkEmailTemplateRepository.details(params.id, auth.current.user.id);

    return response.status(result.code).send(result.success ? result.data : result);
  }

  /**
   * Update bulkemail details.
   * PUT or PATCH bulk-emails-templates/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async update({ params, auth, request, response }) {
    const templateData = request.only(['name', 'parent_folder_id', 'bulk_email_scope_type_id']);
    const templateBodyData = request.only(['subject', 'text', 'html']);
    const { files } = request.only(['files']);
    const result = await BulkEmailTemplateRepository.update(
      params.id,
      templateData,
      templateBodyData,
      files,
      auth.current.user.id,
    );

    return response.status(result.code).send(result.success ? result.data : result);
  }

  /**
   * Update bulkemail folder details.
   * PUT or PATCH bulk-emails-templates/folder/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async updateFolder({ params, auth, request, response }) {
    const result = await BulkEmailTemplateRepository.updateFolder(params.id, request.all(), auth.current.user.id);

    return response.status(result.code).send(result.success ? result.data : result);
  }

  /**
   * Delete a bulkemail with id.
   * DELETE bulk-emails-templates/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async destroy({ params, auth, request, response }) {
    const result = await BulkEmailTemplateRepository.destroy(params.id, auth.current.user.id);

    return response.status(result.code).send(result.success ? result.data : result);
  }

  /**
   * Delete a bulkemail attachment
   * DELETE bulk-emails-templates/attachment/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async destroyAttachment({ params, auth, request, response }) {
    const result = await BulkEmailTemplateRepository.destroyAttachment(params.id, request.all(), auth.current.user.id);

    return response.status(result.code).send(result.success ? result.data : result);
  }

  /**
   * Delete a bulk email template folder with id.
   * DELETE bulk-emails-templates/folder/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async destroyFolder({ params, auth, request, response }) {
    const result = await BulkEmailTemplateRepository.destroyFolder(params.id, auth.current.user.id);

    return response.status(result.code).send(result.success ? result.data : result);
  }
}

module.exports = BulkEmailTemplateController;
