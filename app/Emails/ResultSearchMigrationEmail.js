'use strict';

//Repositories
const SendgridConfigurationRepository = new (use('App/Helpers/SendgridConfigurationRepository'))();
const UserRepository = new (use('App/Helpers/UserRepository'))();
const ModulePresetsConfigRepository =  new (use('App/Helpers/ModulePresetsConfigRepository'))();

//Utils
const SendgridService = use('Services/Sendgrid');
const appInsights = require('applicationinsights');
const Excel = use('xlsx');

class ResultSearchMigrationEmail {
  /**
   *
   * @param {Object} searchProjectMigration
   * @param {Array} errorsNamesFound
   * @param {Object} searchResult
   *
   * @return {void}
   */
  async send(searchProjectMigration, errorsNamesFound, searchResult) {
    try {
      const { recruiterId } = searchProjectMigration.config;
      const userData = await UserRepository.getDetails(searchProjectMigration.created_by);
      const recruiterData = await UserRepository.getDetails(recruiterId);
      const msg = await this.buildMessageBody(userData, recruiterData, errorsNamesFound, searchResult);
      await SendgridService.send(msg);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  }

  async buildMessageBody(userData, recruiterData, errorsNamesFound, searchResult) {
    const config = await ModulePresetsConfigRepository.getById('migration');
    const SendgridConfiguration = await SendgridConfigurationRepository.getByType('bulk');
    const msg = {
      to: userData.email,
      from: SendgridConfiguration.sender,
      subject: `Migration RollUp ${recruiterData.full_name}`,
    };
    if(userData.email != config.data.coordinatorDataLeadEmail){
      msg.cc = config.data.coordinatorDataLeadEmail;
    }
    if (searchResult.success && errorsNamesFound.length === 0) {
      msg.text = `The RollUp was migrated successfully into FortPac!`;
    } else {
      if (!searchResult.success) {
        msg.text = `The SearchProject couldn't be created , please refer to support to check the issue.`;
      }
      if (errorsNamesFound.length > 0) {
        const attachment = this.createErrorsSumarry(errorsNamesFound);
        msg.text = `Some errors were found while migrating some items.`;
        msg.attachments = [
          {
            content: attachment,
            filename: 'errors.xlsx',
            type: 'application/xlsx',
            disposition: 'attachment',
          },
        ];
      }
    }
    return msg;
  }

  createErrorsSumarry(errorsList) {
    const workSheet = Excel.utils.json_to_sheet(errorsList);
    const workBook = Excel.utils.book_new();
    workBook.SheetNames.push('List of Errors');
    workBook.Sheets['List of Errors'] = workSheet;
    return Excel.write(workBook, { bookType: 'xlsx', type: 'base64' });
  }
}

module.exports = ResultSearchMigrationEmail;
