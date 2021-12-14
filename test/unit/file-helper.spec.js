'use strict'

const { test } = use('Test/Suite')('File Helper');
const FileHelper = use('App/Helpers/FileHelper');
const Helpers = use('Helpers');
const Env = use("Env");

const azureUrlStorage = Env.get('AZURE_URL_STORAGE');
const fileName = '(10%!Fil3W&ith#Char@ctersD$cod$d^!)ü,é,á,í,ó,ú,ñ,Ñ,¿,¡.png'
const relativePath = `attachments/${fileName}`;
const urlDecoded = `${azureUrlStorage}${relativePath}`
const urlEncoded = `${azureUrlStorage}attachments/(10%25!Fil3W%26ith%23Char%40ctersD%24cod%24d%5E!)%C3%BC%2C%C3%A9%2C%C3%A1%2C%C3%AD%2C%C3%B3%2C%C3%BA%2C%C3%B1%2C%C3%91%2C%C2%BF%2C%C2%A1.png`


test('make sure a filename url is encoded', async ({ assert }) => {
  assert.equal(FileHelper.encodeFilenameInBlobUrl(urlDecoded, 'files'), urlEncoded);
})

test('make sure extracts a relative path from the blob url', async ({ assert }) => {
  assert.equal(FileHelper.extractRelativePathFromBlobUrl(urlDecoded, 'files'), relativePath);
})

test('make sure a file is uploaded', async ({ assert }) => {
  assert.equal(await FileHelper.uploadFile(`tmp/${fileName}`, Helpers.resourcesPath(fileName)), `${azureUrlStorage}tmp/${fileName}`);
})

test('make sure a file exist on the container', async ({ assert }) => {
  assert.equal(await FileHelper.assertFileExists(`tmp/${fileName}`));
})

test('make sure a file is moved between folders', async ({ assert }) => {
  assert.equal(await FileHelper.moveFile(fileName, relativePath), `${azureUrlStorage}${relativePath}`);
})

test('make sure a file is copied to another path', async ({ assert }) => {
  assert.deepEqual(await FileHelper.copyFile(`${azureUrlStorage}${relativePath}`, 'tmp', fileName), {
    success: true,
    url: `${azureUrlStorage}tmp/${fileName}`
  });
})

test('make sure a file is deleted', async ({ assert }) => {
  assert.equal(await FileHelper.deleteServerFile(`${azureUrlStorage}${relativePath}`), true);
  assert.equal(await FileHelper.deleteServerFile(`${azureUrlStorage}tmp/${fileName}`), true);
})


test('must throw an exception if file is not found on container', async ({ assert }) => {
  assert.plan(1)

  try {
    await FileHelper.assertFileExists(`${azureUrlStorage}${relativePath}`);
  } catch ({ message }) {
    assert.equal(message, 'The provided file was not found on the container')
  }
})

test('make sure a url is decoded', async ({ assert }) => {
  assert.equal(FileHelper.decodeURL(urlEncoded), urlDecoded);
})

test('make sure a url is not decoded if not contains encoded components', async ({ assert }) => {
  assert.equal(FileHelper.decodeURL(fileName), fileName);
})
