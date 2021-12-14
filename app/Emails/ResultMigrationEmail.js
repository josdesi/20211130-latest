'use strict';
const appInsights = require('applicationinsights');
const Excel = use('xlsx');

// Repositories
const SendgridConfigurationRepository = new (use('App/Helpers/SendgridConfigurationRepository'))();
const UserRepository = new (use('App/Helpers/UserRepository'))();
const ModulePresetsConfigRepository = new (use('App/Helpers/ModulePresetsConfigRepository'))();

// Services
const SendgridService = use('Services/Sendgrid');

// Utils
const { uploadFile } = use('App/Helpers/FileHelper');
const { bufferToReadableStream, createMigrationLog, broadcastLog } = use('App/Helpers/Migration/MigrationUtils');
const { migrationType } = use('App/Helpers/Globals');

class ResultMigrationEmail {
  /**
   *
   * @param {Object} migrationResult
   * @param {Array} errorsNamesFound
   *
   * @return {void}
   */
  async send(migration, errorsFound, contacts, entityText, successUploads) {
    try {
      const userData = await UserRepository.getDetails(migration.created_by);
      const msg = await this.buildMessageBody(userData, errorsFound, contacts, entityText, migration, successUploads);
      await SendgridService.send(msg);

      const migrationLog = await createMigrationLog({
        id: migration.id,
        description: `${entityText} migration mail sent`,
        progress: 100,
        type: contacts.length > 0 ? migrationType.Company : migrationType.Contact,
      });
      broadcastLog(entityText.toLowerCase(),migrationLog);
    } catch (error) {
      appInsights.defaultClient.trackException({
        exception: error,
      });
    }
  }

  async buildMessageBody(userData, errorsFound, contacts, entityText, migration, successUploads) {
    const config = await ModulePresetsConfigRepository.getById('migration');
    const SendgridConfiguration = await SendgridConfigurationRepository.getByType('bulk');
    let html;

    const msg = {
      to: userData.email,
      from: SendgridConfiguration.sender,
      subject: `Migration ${entityText}`,
    };

    html = `Migration completed <a href='${encodeURI(migration.url.trim())}'>${migration.original_name}</a>`;

    if (userData.email != config.data.coordinatorDataLeadEmail) {
      msg.cc = config.data.coordinatorDataLeadEmail;
    }

    if (errorsFound.length > 0) {
      const name = 'errors';
      const { fileName, url } = await this.createAndUploadFile(errorsFound, name);

      html = `${html} <br /> Errors file <a href='${encodeURI(url.trim())}'>${fileName}</a>`;
    }

    if (contacts.length > 0) {
      const name = 'contacts';
      const { fileName, url } = await this.createAndUploadFile(contacts, name);

      html = `${html} <br /> Contacts file <a href='${encodeURI(url.trim())}'>${fileName}</a>`;
    }
    
    if(successUploads.length > 0) {
      const name = 'success_data';
      const { fileName, url } = await this.createAndUploadFile(successUploads, name);

      html = `${html} <br /> There were ${successUploads.length} succesfully uploads into FortPac <a href='${encodeURI(url.trim())}'>${fileName}</a>`;
    }

    msg.html = html;

    return msg;
  }

  async createAndUploadFile(data, sheetName) {
    try {
      const workSheet = Excel.utils.json_to_sheet(data);
      const workBook = Excel.utils.book_new();
      const workBookOpts = {
        bookType: 'xlsx',
        type: 'buffer',
      };

      workBook.SheetNames.push(sheetName);
      workBook.Sheets[sheetName] = workSheet;

      const fileName = `${sheetName}-${new Date().getTime()}.${workBookOpts.bookType}`;
      const file = await Excel.write(workBook, workBookOpts);
      const path = `migrations/results/${fileName}`;
      const readable = bufferToReadableStream(file);
      const url = await uploadFile(path, readable);

      return { fileName, url };
    } catch (error) {
      appInsights.defaultClient.trackException({
        exception: error,
      });
      throw error;
    }
  }
}

module.exports = ResultMigrationEmail;
