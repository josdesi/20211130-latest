'use strict'
const { encodeFilenameInBlobUrl  } = use('App/Helpers/FileHelper');
const appInsights = require('applicationinsights');

const FileHook = exports = module.exports = {}

FileHook.encodeFileUrl = async (modelInstance) => {
  try {
    if (Array.isArray(modelInstance)) {
      for(const _modelInstance of modelInstance){
        _modelInstance.url =  encodeFilenameInBlobUrl (_modelInstance.url);
      } 
    }else{
      modelInstance.url =  encodeFilenameInBlobUrl (modelInstance.url);
    }
  } catch (error) {
    appInsights.defaultClient.trackEvent({ name: 'FileHook Encode Failed', properties: _modelInstance });
  }
}
