'use strict';
const Logger = use('Logger');
const Event = use('Event');
const EventType = use('App/Helpers/Events');
const appInsights = require("applicationinsights");
const HiringAuthority = use('App/Models/HiringAuthority');
const HiringAuthorityHasFile = use('App/Models/HiringAuthorityHasFile');
const { fileType } = use('App/Helpers/FileType');
const HiringAuthorityRepository = new (use('App/Helpers/HiringAuthorityRepository'))();
const { uploadFile, getMultipartConfig } = use('App/Helpers/FileHelper');
const {HiringAuthorityNote} = use('App/Models/HiringAuthorityNote');
const path = require('path');
const JobOrderHasHiringAuthority = use('App/Models/JobOrderHasHiringAuthority');
/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */
/** @typedef {import('@adonisjs/framework/src/View')} View */

/**
 * Resourceful controller for interacting with hiringauthorities
 */
class HiringAuthorityController {
  /**
   * Show a list of all hiringauthorities.
   * GET hiringauthorities
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {View} ctx.view
   */
  async index({ request, response }) {}

  /**
   * Display a single hiringauthority.
   * GET hiringauthorities/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {View} ctx.view
   */
  async show({ params, request, response }) {
  }

    /**
   * Display a single hiringauthority.
   * GET hiringauthorities/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {View} ctx.view
   */
  async find({ params, response }) {

    try {
      const hiringAutority = await HiringAuthorityRepository.findWithAll(params.id);
      return response.status(200).send(hiringAutority);
    } catch (err) {
      appInsights.defaultClient.trackException({ exception: err });

      return response.status(500).send({
        message: 'There was a problem getting the hiring authority, please try again later'
      });
    }
  }

  /**
   * Update hiringauthority details.
   * PUT or PATCH hiringauthorities/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async update({ params, request, response }) {
    try {
      const hiringAuthority = await HiringAuthority.query()
        .where('id', params.id)
        // .where('company_id', params.companyId)
        .first();
      if (!hiringAuthority) {
        return response.status(404).send({
          success: false,
          code: 404,
          message: 'The hiring authority was not found'
        });
      }
      const data = request.only(      [
        'first_name',
        'last_name',
        'title',
        'personal_email',
        'work_email',
        'personal_phone',
        'work_phone',
        'ext',
        'other_ext',
        'specialty_id',
        'subspecialty_id',
        'position_id'
      ]);
      await hiringAuthority.merge(data);
      await hiringAuthority.save();
      await hiringAuthority.loadMany([
        'company',
        'specialty',
        'subspecialty',
        'position',
        'specialty.industry',
        'hiringAuthorityStatus'
      ]);
      Event.fire(EventType.HiringAuthority.Updated, {hiringAuthority});
      return response.status(201).send(hiringAuthority);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return response.status(500).send({
        succes: false,
        code: 500,
        message: 'There was a problem getting the hiring authority, please try again later'
      });
    }
  }

  /**
   * Delete a hiringauthority with id.
   * DELETE hiringauthorities/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async destroy({ params,  response }) {
    try {
      const hiringAuthority = await HiringAuthority.query()
        .where('id',params.id)
        .where('company_id',params.companyId)
        .first();
      if (!hiringAuthority) {
        return response.status(404).send({
          message: 'HiringAuthority not found' 
        });
      }
      const assignations = await JobOrderHasHiringAuthority.query()
                                  .where('hiring_authority_id', params.id)
                                  .getCount()

      if(assignations > 0){
        return response.status(400).send({
          message: 'The Hiring Authority is Assigned to a JobOrder' 
        });
      }
      await hiringAuthority.delete();
      Event.fire(EventType.HiringAuthority.Deleted, {hiringAuthority});
      return response.status(200).send({ message:'The Hiring Authority was deleted' });
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return response.send({
        succes: false,
        code: 500,
        message:'There was a problem deleting the hiring authority, please try again later'
      });
    }
  }

    /**
   * Create/save a new hiring authority note.
   * POST hiring-autorities/:id/notes
   *
   * @method storeNote
   *
   * @param {Authentication} ctx.auth
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {object} ctx
   *
   * @return {object} Response with the created note or an error code
   */
     async storeNote({ auth, request, response, params }) {
      const { body, title } = request.only(['body', 'title']);
      const result = await HiringAuthorityRepository.createNote(body, title, params.id, auth.current.user.id);
  
      return response.status(result.code).send(result);
    }

    /**
   * Update a  hiring authority  note.
   * POST hiring-authorities/:hiringAuthorityId/notes/:id
   *
   * @method updateNote
   *
   * @param {Authentication} ctx.auth
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {object} ctx
   *
   * @return {object} Response with the updated note or an error code
   */
     async updateNote({ auth, request, response, params }) {
      const { body, title } = request.only(['body', 'title']);
      const result = await HiringAuthorityRepository.updateNote(
        body,
        title,
        params.id,
        params.hiringAuthorityId,
        auth.current.user.id
      );
      if (result.success && result.data) {
        return response.status(result.code).send(result.data);
      }
      return response.status(result.code).send(result);
    }

      /**
   * Destroy a company note.
   * Delete hiring-authorities/:hiringAuthorityId/notes/:id
   *
   * @method destroyNote
   *
   * @param {Authentication} ctx.auth
   * @param {Response} ctx.response
   * @param {object} ctx
   *
   * @return {Object} A succes of the deleted note or an error code
   */
  async destroyNote({ auth, response, params }) {
    const result = await HiringAuthorityRepository.deleteNote(params.id, params.hiringAuthorityId, auth.current.user.id);

    return response.status(result.code).send(result);
  }


      /**
   * Upload File.
   * POST candidates/:id/files
   *
   * @method storeFile
   *
   * @param {Authentication} ctx.auth
   * @param {Request} ctx.request
   * @param {object} ctx
   * @param {Response} ctx.response
   *
   * @return {Object} Response with the uploaded file or a message error
   */
  async storeFile({ auth, request, params, response }) {
    const hiringAuthority = await HiringAuthority.find(params.id);
    if (!hiringAuthority) {
      return response.status(404).send({
        message: 'Hiring Authority not Found',
      });
    }
    try {
      request.multipart.file('file', getMultipartConfig(), async (file) => {
        await file.runValidations();
        const error = file.error();
        if (error.message) {
          return response.status(400).send({
            message: error.message,
          });
        }
        const originalName = path.parse(file.clientName).name;
        const fileName = `${originalName}-${new Date().getTime()}.${file.extname}`;
        const absolutePath = await uploadFile('attachments/' + fileName, file.stream);
        if (!absolutePath) {
          return response.status(500).send({
            message: 'There was a problem uploading the file , pleae try again later!',
          });
        }
        const hiringAuthorityFile = await HiringAuthorityHasFile.create({
          hiring_authority_id: hiringAuthority.id,
          file_type_id: await fileType('ATTACHMENT'),
          url: absolutePath,
          file_name: `${originalName}.${file.extname}`,
        });
        await hiringAuthority.save();
        Event.fire(EventType.HiringAuthority.Updated, {hiringAuthority});
        return response.status(201).send(hiringAuthorityFile);
      });
      await request.multipart.process();
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return response.status(500).send({
        message: 'There was a problem uploading the file, please try again later',
      });
    }
  }

    /**
   *Destroy a file
   *DELETE hiring-authorities/:id/files/:fileId
   *
   * @method deleteFile
   *
   * @param {Authentication} ctx.auth
   * @param {object} ctx
   * @param {Response} ctx.response
   *
   * @return {Object} A message with a code 200 or an error code
   */
   async deleteFile({ auth, params, response }) {
    const result = await HiringAuthorityRepository.deleteFile(params.id, params.fileId, auth.current.user.id);
    return response.status(result.code).send(result);
  }

    /**
   * Create/save a new hiring authority note.
   * POST hiring-authorities/:id/activityLogs
   *
   * @method storeActivityLog
   *
   * @param {Authentication} ctx.auth
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {object} ctx
   *
   * @return {Object} Response with the created activity or an error code
   */
     async storeActivityLog({ auth, request, response, params }) {
      const { body, activity_log_type_id } = request.only(['body', 'activity_log_type_id']);
      const result = await HiringAuthorityRepository.createActivityLog(
        body,
        activity_log_type_id,
        params.id,
        auth.current.user.id
      );
  
      return response.status(result.code).send(result);
    }

    /**
   * Create/save a new external HA activity log.
   * POST hiring-authorities/:id/external/activityLogs
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async storeExternalActivityLog({ request, response, params }) {
    const { 
      body, 
      activity_log_type_id, 
      user_id,
      optional_params
    } = request.only(['body', 'activity_log_type_id', 'user_id', 'optional_params']);

    const result = await HiringAuthorityRepository.createActivityLog(
      body,
      activity_log_type_id,
      params.id,
      user_id,
      optional_params
    );

    return response.status(result.code).send(result);
  }

    /**
   * Update a Hiring authority activity log.
   * POST hiring-authorities/:hiringAuthorityId/activityLogs/:id
   *
   * @method updateActivityLog
   *
   * @param {Authentication} ctx.auth
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {object} ctx
   *
   * @return {Object} Response with the updated activity or an error code
   */
  async updateActivityLog({ auth, request, response, params }) {
    const { body } = request.only(['body']);
    const result = await HiringAuthorityRepository.updateActivityLog(
      body,
      params.id,
      params.hiringAuthorityId,
      auth.current.user.id
    );

    if (result.success && result.data) {
      return response.status(result.code).send(result.data);
    }
    return response.status(result.code).send(result);
  }


    /**
   * Destroy a hiring authority activity log.
   * Delete candidates/:hiringAuthorityId/activityLogs/:id
   *
   * @method destroyActivityLog
   *
   * @param {Authentication} ctx.auth
   * @param {Response} ctx.response
   * @param {object} ctx
   *
   * @return {Object} Succes message or an error code
   */
     async destroyActivityLog({ auth, response, params }) {
      const result = await HiringAuthorityRepository.deleteActivityLog(params.id, params.hiringAuthorityId, auth.current.user.id);
  
      return response.status(result.code).send(result);
    }
}

module.exports = HiringAuthorityController;
