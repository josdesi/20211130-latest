'use strict';

/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */
/** @typedef {import('@adonisjs/framework/src/View')} View */

//Utils
const appInsights = require("applicationinsights");
const Drive = use('Drive');
const path = require('path');
const { uploadFile, deleteServerFile, getMultipartConfig, extractRelativePathFromBlobUrl, readFilePropertiesFromPath } = use('App/Helpers/FileHelper');
const { validFileFormats, contentDispositionHeaderBuilders } = use('App/Helpers/Globals');
const getStream = use('get-stream');
const Antl = use('Antl');

//Models
const UserHasTempFile = use('App/Models/UserHasTempFile');
const FileInformation = use('App/Models/FileInformation');
const FileType = use('App/Models/FileType');

class FileController {
  /**
   * Upload file
   * POST file
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async upload({ auth, request, response }) {
    const files = [];
    let fileError;

    request.multipart.file('file', getMultipartConfig(), async file => {
      await file.runValidations();
      const error = file.error();
      if (error.message) {
        fileError = error;
        return;
      }
      files.push({
        ...file,
        stream: await getStream.buffer(file.stream)
      });
    });
    try {
      await request.multipart.process();
      if (fileError) {
        return response.status(400).send({
          message: fileError.message,
        });
      }
      const user_id = auth.current.user.id;
      const filesUploaded = [];
      for(const file of files){
        const originalName = path.parse(file.clientName).name
        const fileName = `${originalName}-${new Date().getTime()}.${file.extname}`;
        const absolutePath = await uploadFile('tmp/' + fileName, file.stream);
        if (!absolutePath) {
          return response.status(500).send({
            message: Antl.formatMessage('messages.error.internalServer', {
              action: 'uploading',
              entity: 'files',
            }),
          });
        }
        const userTempFile = await UserHasTempFile.create({
          user_id,
          url: absolutePath,
          file_name:fileName,
          original_name:`${originalName}.${file.extname}`
        });
        filesUploaded.push({
          ...userTempFile.toJSON(),
          file_name: userTempFile.original_name
        })
      }
      return response.ok(filesUploaded.length === 1 ? filesUploaded[0] : filesUploaded);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return response.status(500).send({
        message: Antl.formatMessage('messages.error.internalServer', {
          action: 'uploading',
          entity: 'files',
        })
      });
    }
  }

  /**
   * DELETE file
   * POST file
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async destroy({ auth, params, response }) {
    try {
      const userId = auth.current.user.id;
      const tempFile = await UserHasTempFile.find(params.id);
      if (!tempFile) {
        return response.status(404).send({
          message: 'File not found' 
        });
      }
      if (tempFile.user_id != userId) {
        return response.status(403).send({
          message: "You are looking for a file that doesn't belongs you!" ,
          isInactive:false,
          redirect:false
        });
      }
      await FileInformation.query().where('user_has_temp_file_id', tempFile.id).delete()
      await deleteServerFile(tempFile.url);
      await tempFile.delete();
      return response.status(200).send({
        message: 'The file was deleted successfully!'
      });
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return response.status(500).send({
        message: 'There was a problem deleting the file, please try again later' 
      });
    }
   
  }

  async getFile({request, response}) {
    const inputPath = request.input('path');
    const inputUrl = request.input('url');
    const format = request.input('format');
    const mode = request.input('mode');
    const contentTypeHeader = validFileFormats[format] || 'application/octet-stream';
    const contentDispositionHeaderBuilder = contentDispositionHeaderBuilders[mode] || contentDispositionHeaderBuilders['download'];
    
    try {
      const path = inputPath ? inputPath : extractRelativePathFromBlobUrl(inputUrl);
      const fileName = this.extractFileName(path);
      const contentDispositionHeader = contentDispositionHeaderBuilder(fileName);
      const fileStream = await Drive.disk('azure').getStream(path);
      response.implicitEnd = false;
      response.response.setHeader('Content-type', contentTypeHeader);
      response.response.setHeader('Content-disposition', contentDispositionHeader);
      fileStream.blobDownloadStream.pipe(response.response);
    } catch(error) {
      appInsights.defaultClient.trackException({ exception: error });

      return response.status(500).send({
        message: 'There was a problem deleting the file, please try again later' 
      });
    }
  }

  extractFileName(path) {
    const parts = path.split('/');
    const fileName = parts[parts.length - 1];
    return fileName;
  }

  /**
   * Show a list of all file types.
   * GET types
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async getFileTypes({request, response}) {
    try {
      const { module } = request.only(['module']);
      const query =  FileType.query();
      module && query.where({module});
      const types = await query.orderBy('order').fetch(); 
      return response.ok(types);
    } catch(error) {
      appInsights.defaultClient.trackException({ exception: error });

      return response.status(500).send({
        message: 'There was a problem getting the types, please try again later' 
      });
    }
  }

  /**
   * Get the attributes of file by url file
   * GET File Attributes
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async getFileAttributes({request, response}) {
    const inputPath = request.input('path');
    const inputUrl = request.input('url');
    
    try {
      const path = inputPath ? inputPath : extractRelativePathFromBlobUrl(inputUrl);
      const fileName = this.extractFileName(path);

      const fileProps = await readFilePropertiesFromPath(path);
      const { contentLength, createdOn, lastModified } = fileProps;
      const fileResponse = {
        size: contentLength,
        fileName: fileName,
        lastModified,
        createdOn

      };
      response.ok(fileResponse);

    } catch(error) {
      appInsights.defaultClient.trackException({ exception: error });

      return response.status(500).send({
        message: 'There was a problem getting the attributes, please try again later' 
      });
    }
  }
  
}

module.exports = FileController;
