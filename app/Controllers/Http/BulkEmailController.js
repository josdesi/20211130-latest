'use strict';

const Antl = use('Antl');

/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */
/** @typedef {import('@adonisjs/framework/src/View')} View */

//Repositories
const BulkEmailRepository = new (use('App/Helpers/BulkEmailRepository'))();

//utils
const appInsights = require('applicationinsights');
const path = require('path');
const { uploadFile } = use('App/Helpers/FileHelper');

//Models
const UserHasTempFile = use('App/Models/UserHasTempFile');
const EmailImage = use('App/Models/EmailImage');
const FileInformation = use('App/Models/FileInformation');

/**
 * Resourceful controller for interacting with bulkemails
 */
class BulkEmailController {
  /**
   * Upload an attachment
   *
   * @description This method works akin to the upload file, but this accepts more extnames
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async uploadAttachment({ auth, request, response }) {
    try {
      const multipartConfig = {
        size: '5mb',
        extnames: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'csv'],
      };

      // multipart config object
      const user_id = auth.current.user.id;
      request.multipart.file('file', multipartConfig, async (file) => {
        await file.runValidations();
        const error = file.error();
        if (error.message) {
          return response.status(400).send({
            message: error.message,
          });
        }
        const originalName = path.parse(file.clientName).name;
        const fileName = `${originalName}-${new Date().getTime()}.${file.extname}`;
        const absolutePath = await uploadFile('tmp/' + fileName, file.stream);
        if (!absolutePath) {
          return response.status(500).send({
            message: 'There was a problem while uploading the attachment',
          });
        }
        const userTempFile = await UserHasTempFile.create({
          user_id,
          url: absolutePath,
          file_name: fileName,
          original_name: `${originalName}.${file.extname}`,
        });

        const fileInformation = await FileInformation.create({
          user_has_temp_file_id: userTempFile.id,
          file_size: file.stream.byteCount,
        });

        userTempFile.information = fileInformation;

        return response.status(201).send(userTempFile);
      });
      await request.multipart.process();
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return response.status(500).send({
        message: 'There was a problem while uploading the attachment',
      });
    }
  }

  /**
   * Upload an attachment
   *
   * @description This method works akin to the upload file, but this accepts more extnames
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async uploadImage({ auth, request, response }) {
    try {
      const multipartConfig = {
        size: '5mb',
        extnames: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      };

      // multipart config object
      const user_id = auth.current.user.id;
      request.multipart.file('upload', multipartConfig, async (file) => {
        await file.runValidations();
        const error = file.error();
        if (error.message) {
          return response.status(400).send({
            message: error.message,
          });
        }
        const originalName = path.parse(file.clientName).name;
        const fileName = `${originalName}-${new Date().getTime()}.${file.extname}`;
        const absolutePath = await uploadFile('email-images/' + fileName, file.stream);
        if (!absolutePath) {
          return response.status(500).send({
            message: 'There was a problem while uploading an email image',
          });
        }
        const userTempFile = await EmailImage.create({
          user_id,
          url: absolutePath,
          file_name: fileName,
          original_name: `${originalName}.${file.extname}`,
        });
        return response.status(201).send({
          url: userTempFile.url,
        });
      });
      await request.multipart.process();
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return response.status(500).send({
        message: 'There was a problem while uploading an email image',
      });
    }
  }

  /**
   * Show a list of all bulkemails.
   * GET bulkemails
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {View} ctx.view
   */
  async index({ request, auth, response }) {
    const result = await BulkEmailRepository.listing(request.all(), auth.current.user.id);

    return response.status(result.code).send(result.success ? result.data : result);
  }

  /**
   * Show a list of all available bulk scopes.
   * GET bulkemails/scopes
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {View} ctx.view
   */
  async indexScopes({ request, auth, response }) {
    const result = await BulkEmailRepository.listingScopes();

    return response.status(result.code).send(result.success ? result.data : result);
  }

  /**
   * Create & send a new bulkemail.
   * POST bulk-emails
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async store({ auth, request, response }) {
    try {
      const emailData = request.only([
        'is_draft',
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
        'block_similar_companies',
        'block_client_companies',
      ]);
      const candidateIds = request.input('candidate_ids');
      const jobOrderIds = request.input('job_order_ids');
      const userId = auth.current.user.id;

      let result = null;
      if (emailData.is_draft) {
        result = await BulkEmailRepository.create(emailData, userId, candidateIds, jobOrderIds);
      } else {
        result = await BulkEmailRepository.createAndSend(emailData, userId, candidateIds, jobOrderIds);
      }

      if (!result.success || result.code != 201) {
        const properties = {
          ...result,
          payload: {
            ...emailData,
            candidateIds,
            jobOrderIds,
            userId,
          },
        };
        appInsights.defaultClient.trackEvent({ name: 'Bulk Email Failed', properties });

        if (!emailData.is_draft) {
          const failureDraftCreated = await this.createFailureDraft(
            emailData,
            userId,
            candidateIds,
            jobOrderIds,
            result
          );
          if (failureDraftCreated) result.message = `Failure Draft Created. ${result.message}`;
        }
      }

      return response.status(result.code ? result.code : result.statusCode).send(result.success ? result.data : result);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return response.status(500).send({
        message: 'There was a problem while creating a bulk email',
      });
    }
  }

  async createFailureDraft(emailData, userId, candidateIds, jobOrderIds, result) {
    try {
      const errorData = result.data ? result.data : {};
      const { blockedEmails = [], invalidEmails = [] } = errorData;

      emailData.is_draft = true;
      const errors = { blockedEmails, invalidEmails, message: result.message };
      const failureDraft = await BulkEmailRepository.createFailureDraft(
        emailData,
        userId,
        candidateIds,
        jobOrderIds,
        errors
      );
      if (failureDraft.success) return failureDraft.success;

      return false;
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return false;
    }
  }

  /**
   * Display a single bulkemail.
   * GET bulkemails/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {View} ctx.view
   */
  async show({ params, auth, request, response }) {
    const result = await BulkEmailRepository.details(params.id, auth.current.user.id);

    return response.status(result.code).send(result.success ? result.data : result);
  }

  /**
   * Show a list of all bulkemails that are drafts.
   * GET bulkemails/drafts
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {View} ctx.view
   */
  async indexDrafts({ request, auth, response }) {
    const result = await BulkEmailRepository.listingDrafts(request.all(), auth.current.user.id);

    return response.status(result.code).send(result.success ? result.data : result);
  }

  /**
   * Update bulkemail details that is a draft.
   * PUT or PATCH bulkemails/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async updateDraft({ params, auth, request, response }) {
    const drafData = request.only(['search_project_id', 'block_resend', 'block_duration_days']);
    const draftBodyData = request.only(['subject', 'text', 'html']);
    const { files } = request.only(['files']);

    const result = await BulkEmailRepository.updateDraft(
      params.id,
      drafData,
      draftBodyData,
      files,
      auth.current.user.id
    );

    return response.status(result.code).send(result.success ? result.data : result);
  }

  /**
   * Delete a bulkemail draft attachment
   * DELETE bulk-emails/draft/attachment/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async destroyAttachment({ params, auth, request, response }) {
    const { attachment_id } = request.only(['attachment_id']);

    const result = await BulkEmailRepository.destroyAttachment(params.id, attachment_id, auth.current.user.id);

    return response.status(result.code).send(result.success ? result.data : result);
  }

  /**
   * Delete a bulkemail with id that is a draft.
   * DELETE bulkemails/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async destroyDraft({ params, auth, request, response }) {
    const result = await BulkEmailRepository.destroyDraft(params.id, auth.current.user.id);

    return response.status(result.code).send(result.success ? result.data : result);
  }

  /**
   * Generates the preview of one specific bulk body
   * POST /preview/body
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async bodyPreview({ auth, request, response }) {
    try {
      const body = request.input('body');
      const searchProjectId = request.input('search_project_id');
      const userId = auth.current.user.id;

      const result = await BulkEmailRepository.generateBodyPreview(body, searchProjectId, userId);

      return response.status(result.code ? result.code : result.statusCode).send(result.success ? result.data : result);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return response.status(500).send({
        message: Antl.formatMessage('messages.error.internalServer', {
          action: 'obtaining',
          entity: 'bulk preview',
        }),
      });
    }
  }
}

module.exports = BulkEmailController;
