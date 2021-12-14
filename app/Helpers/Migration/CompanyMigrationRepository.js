'use strict';

// Utils
const appInsights = use('applicationinsights');
const { getFileBuffer } = use('App/Helpers/FileHelper');
const { JobNames } = use('App/Scheduler/Constants');
const Excel = require('xlsx');
const { scheduleTask, migrationProgress, getUniqueIndustries, getColumnsDataSheet } = use('App/Helpers/Migration/MigrationUtils');
const { find } = use('lodash');
// Models
const Migration = use('App/Models/Migration');


//Repositories
const CompanyMigrationProcess = use('App/Helpers/Migration/CompanyMigrationProcess');

class CompanyMigrationRepository {

  constructor(){
     this.companyMigrationProcess = new CompanyMigrationProcess();
  }

  async create(absolutePath, fileName, originalName, extname, userId, sourceId) {
    const config = {
      industries_mapping: [],
      sourceId
    };

    return await Migration.create({
      url: absolutePath,
      file_name: fileName,
      original_name: `${originalName}.${extname}`,
      created_by: userId,
      config,
      type: 'company',
    });
  }

  async updateIndustriesData(migrationId, industries_mapping, is_high_priority = true) {
    try {
      const companyMigration = await Migration.find(migrationId);
      if (!companyMigration) {
        return {
          success: false,
          code: 400,
          message: "The migration for this company doesn't exist",
        };
      }
      companyMigration.config.industries_mapping = industries_mapping;
      companyMigration.status = 'config-completed';
      companyMigration.is_high_priority = is_high_priority;

      await companyMigration.save();
      is_high_priority && await scheduleTask(companyMigration.id, JobNames.Migrations.Company);

      return {
        code: 200,
        success: true,
        data: companyMigration,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        message: 'There was a problem updating the migration, please try again later',
      };
    }
  }

  async updateColumnsData(migrationId, fieldsMapped) {
    try {
      const companyMigration = await Migration.find(migrationId);
      if (!companyMigration) {
        return {
          success: false,
          code: 400,
          message: "The migration for this company doesn't exist",
        };
      }
      const fieldsColumn = {};
      const fileBuffer = await getFileBuffer(companyMigration.url);
      const book = Excel.read(fileBuffer);
      const sheet = book.Sheets[book.SheetNames[0]];
      const columnsFile = getColumnsDataSheet(sheet);

      for (const property in fieldsMapped) {
        const { columnKey  } = fieldsMapped[property];
        const columnInfo = find(columnsFile, { id: columnKey });
        fieldsColumn[property] = columnInfo ? columnInfo.title : null;
      }

      companyMigration.config.fieldsMapped = fieldsColumn;
      await companyMigration.save();

      const data = Excel.utils.sheet_to_json(sheet);
      const { industry, specialty, subspecialty } = fieldsColumn;
      const industries_mapping = await getUniqueIndustries(data, industry, specialty, subspecialty);

      return {
        code: 200,
        success: true,
        data: {
          companyMigration,
          industries_mapping,
        },
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        message: 'There was a problem updating the migration, please try again later',
      };
    }
  }

  async processMigration(migrationId) {
    const companyMigration = await Migration.find(migrationId);
    if (!companyMigration) {
      return null;
    }
    const { industries_mapping, fieldsMapped, sourceId  } = companyMigration.config;
    const fileBuffer = await getFileBuffer(companyMigration.url);
    const book = Excel.read(fileBuffer);
    const sheet = book.Sheets[book.SheetNames[0]];

    const data = Excel.utils.sheet_to_json(sheet);
    const { errorsFound, contacts, successUploads, success, error } = await this.companyMigrationProcess.start(migrationId, data, industries_mapping, fieldsMapped, sourceId);

    return {
      errorsFound,
      companyMigration,
      contacts,
      successUploads,
      success,
      error
    };
  }

  async migrationProgress(migrationId) {
    return await migrationProgress(migrationId);
  }
}

module.exports = CompanyMigrationRepository;
