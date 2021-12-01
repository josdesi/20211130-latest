'use strict'
const { encodeFilenameInBlobUrl  } = use('App/Helpers/FileHelper');


const FileHook = exports = module.exports = {}

FileHook.encodeFileUrl = async (modelInstance) => {
  if (Array.isArray(modelInstance)) {
    for(const _modelInstance of modelInstance){
      _modelInstance.url =  encodeFilenameInBlobUrl (_modelInstance.url);
    } 
  }else{
    modelInstance.url =  encodeFilenameInBlobUrl (modelInstance.url);
  }
}
