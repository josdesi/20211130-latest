'use strict';
/**
 * Helper Functions
 * @version 1.0.0
 */
const Drive = use('Drive');
const { Stream } = require('stream');
const urlP = require('url');
const appInsights = require('applicationinsights');
const defaultValidExtNames = ['jpg', 'jpeg','png', 'pdf', 'doc','docx','ppt','pptx', 'xlsx', 'csv', 'xls'] ;
const defaultSizeLimit = '5mb';
/**
 * Upload Video to Store repo
 * @param {String} path Where image should be stored
 * @param {BinaryString} stream Image binary stream
 * @returns {String} Public URL from Azure
 * @return {Boolean} File is not stored in azure storage.
 */
const uploadFile = async (path, source) => {

  
    if (source instanceof Stream) {
      await Drive.disk('azure').putStream(path, source);
    } else {
      await Drive.disk('azure').put(path, source);
    }
  

  if (await Drive.disk('azure').exists(path)) {
    const url = await Drive.disk('azure').getUrl(path);
    return decodeURIComponent(url);
  } else {
    return false;
  }
};

/**
 * Move File to another path
 * @param {String} tmpPath Where image is actual being stored
 * @param {String}  path Where image should be stored
 * @returns {String} Public URL from Azure
 * @return {Boolean} File is not stored in azure storage.
 */
const moveFile = async (fileName, path) => {
  const decodedPath = decodeURIComponent(path);

    await Drive.disk('azure').move('tmp/'+ decodeURIComponent(fileName), decodedPath);


  if (await Drive.disk('azure').exists(decodedPath)) {
    const url = await Drive.disk('azure').getUrl(decodedPath);
    return decodeURIComponent(url);
  } else {
    return false;
  }
};

/**
 * Asserts a url exists in the blob container
 * @param {String} relativeFilePath The path relative to the default blob container
 * @throws {String} Error if the url is not valid or the blob does not exists
 */
const assertFileExists = async (relativeFilePath) => {
  if (!relativeFilePath) throw new Error('The provided URL is not inside default container');
  if (!(await Drive.disk('azure').exists(relativeFilePath))) throw new Error('The provided file was not found on the container');
};

/**
 * Delete File
 * @param {String}  path Where image
 * @returns {String} Public URL from Azure
 * @return {Boolean} Whether the file was deleted or not.
 */
const deleteServerFile = async (url) => {
  try {
    const relativeFilePath = extractRelativePathFromBlobUrl(url);
    await assertFileExists(relativeFilePath);

    await Drive.disk('azure').delete(relativeFilePath);

    return true;
  } catch (error) {
    appInsights.defaultClient.trackException({ exception: error });

    return false;
  }
};

const copyFile = async (url , folder, destinationName) => {
  try {
    const relativeFilePath = extractRelativePathFromBlobUrl(url);
    await assertFileExists(relativeFilePath);

    const destinationPath = `${folder}/${destinationName}`;
    await Drive.disk('azure').copy(relativeFilePath, destinationPath);
    if (await Drive.disk('azure').exists(destinationPath)) {
      const url = await Drive.disk('azure').getUrl(destinationPath);
      return {
        success: true,
        url: decodeURIComponent(url)
      }
    }

    throw new Error('The File Copied was not found on the container');
  } catch (error) {
    return {
      success: false,
      error
    }
  }
};


const getFileBuffer = async (url) => {
  const pathFile = urlP.parse(decodeURIComponent(url)).path.split('/files/');
  const urlPath = pathFile[1].split('/');
  const path = urlPath.join('/')

  return await Drive.disk('azure').get(decodeURIComponent(path))
};

const getFileAsBase64 = async(url) => {
  const fileBuffer = await getFileBuffer(url);
  const b64String = fileBuffer.toString('base64');
  return b64String;
}

const splitBlobUrlByContainer = (url, defaultContainer = 'files') => {
  if(!url) throw new Error('Missing Param URL');

  const urlParts = decodeURIComponent(url).split(`/${defaultContainer}/`);
  const isValidBlobUrl = urlParts.length === 2;
  if(!isValidBlobUrl) throw new Error('Invalid Blob URL');

  return urlParts;
}

/**
 * Extract the relative path after the main container of a blob url. 
 * For example, given https://gpac.blob.core.windows.net/files/attachments/hi.pdf, it returns attachments/hi.pdf
 * @param {String} url Url of the blob file
 * @param {String} defaultContainer Default container configured for the blobl storage drive implementation
 * @returns {String} Path relative to the default container
 */
const extractRelativePathFromBlobUrl = (url, defaultContainer = 'files') => {
  const urlParts = splitBlobUrlByContainer(url, defaultContainer);
  return urlParts[1];
}

const encodeFilenameInBlobUrl  = (url, defaultContainer = 'files') => {
  const urlParts = splitBlobUrlByContainer(url, defaultContainer);
  const [baseUrl, path] = urlParts;
  const [folderName, fileName] = path.split('/');
  return `${baseUrl}/${defaultContainer}/${folderName}/${encodeURIComponent(fileName)}`;
}

/**
 * Extract the properties from File saved in server.
 * @param {String} pathUrl Url of File 
 * @returns {Object} Object with all properties of file
 */
 const readFilePropertiesFromPath = async (pathUrl) => {
  try {
    const reference = Drive.disk('azure').getBlockBlobClient(pathUrl);
    const props = await reference.getProperties();
    return props;
  }
  catch(ex) {
    return {};
  }
}

const getMultipartConfig = ({ sizeLimit, extensions } = {}) => { 
  const extnames = [];
  (extensions || defaultValidExtNames).forEach((ext) => {
    const extStr = String(ext);
    extnames.push(...[extStr.toLowerCase(), extStr.toUpperCase()]);
  })
  return {
    size: sizeLimit || defaultSizeLimit, 
    extnames
  }
}

module.exports = {
  uploadFile,
  moveFile,
  deleteServerFile,
  copyFile,
  getMultipartConfig,
  getFileBuffer,
  extractRelativePathFromBlobUrl,
  encodeFilenameInBlobUrl,
  assertFileExists,
  readFilePropertiesFromPath,
  getFileAsBase64
};
