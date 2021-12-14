'use strict';

// Utils
const appInsights = use('applicationinsights');
const { getFileBuffer } = use('App/Helpers/FileHelper');
const { JobNames } = use('App/Scheduler/Constants');
const Excel = require('xlsx');
const { getDataFile, getUniquePositions, scheduleTask, migrationProgress, getUniqueIndustries, getColumnsDataSheet } = use(
  'App/Helpers/Migration/MigrationUtils'
);
const { find } = use('lodash');

// Models
const Migration = use('App/Models/Migration');

//Repositories
const ContactsMigrationProcess = use('App/Helpers/Migration/ContactsMigrationProcess');

class ContactsMigrationRepository {
  constructor(){
    this.contactsMigrationProcess = new ContactsMigrationProcess();
  }

  async create(absolutePath, fileName, originalName, extname, userId, companyId, sourceId) {
    const config = {
      industries_mapping: [],
      sourceId
    };
    if(Number.isSafeInteger(companyId)){
      config.companyId = companyId;
    }
    return await Migration.create({
      url: absolutePath,
      file_name: fileName,
      original_name: `${originalName}.${extname}`,
      created_by: userId,
      config,
      type: 'contacts',
    });
  }

  async updateIndustriesData(migrationId, industries_mapping) {
    try {
      const contactsMigration = await Migration.find(migrationId);

      if (!contactsMigration) {
        return {
          success: false,
          code: 400,
          message: "The migration file doesn't exist",
        };
      }

      const fileBuffer = await getFileBuffer(contactsMigration.url);
      const data = await getDataFile(fileBuffer);

      contactsMigration.config.industries_mapping = industries_mapping;
      contactsMigration.status = 'config-completed';
      await contactsMigration.save();

      const { industry, specialty, subspecialty, functionalTitle } = contactsMigration.config.fieldsMapped;
      const positions_mapping = getUniquePositions(data, industries_mapping, industry, specialty, subspecialty, functionalTitle);

      return {
        code: 200,
        success: true,
        data: {
          contactsMigration,
          positions_mapping,
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

  async updateColumnsData(migrationId, fieldsMapped) {
    try {
      const contactsMigration = await Migration.find(migrationId);

      if (!contactsMigration) {
        return {
          success: false,
          code: 400,
          message: "The migration file doesn't exist",
        };
      }
      const fieldsColumn = {};
      const fileBuffer = await getFileBuffer(contactsMigration.url);
      const book = Excel.read(fileBuffer);
      const sheet = book.Sheets[book.SheetNames[0]];
      const columnsFile = getColumnsDataSheet(sheet);

      for (const property in fieldsMapped) {
        const { columnKey  } = fieldsMapped[property];
        const columnInfo = find(columnsFile, { id: columnKey });
        fieldsColumn[property] = columnInfo ? columnInfo.title : null;
      }

      contactsMigration.config.fieldsMapped = fieldsColumn;
      await contactsMigration.save();

      const data = Excel.utils.sheet_to_json(sheet);
      const { industry, specialty, subspecialty } = fieldsColumn;
      const industries_mapping = await getUniqueIndustries(data, industry, specialty, subspecialty);

      return {
        code: 200,
        success: true,
        data: {
          contactsMigration,
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

  async updatePositionData(migrationId, positions_mapping, is_high_priority = true) {
    try {
      const contactsMigration = await Migration.find(migrationId);

      if (!contactsMigration) {
        return {
          success: false,
          code: 400,
          message: "The migration doesn't exist",
        };
      }

      contactsMigration.config.positions_mapping = positions_mapping;
      contactsMigration.is_high_priority = is_high_priority;
      await contactsMigration.save();
      is_high_priority && await scheduleTask(contactsMigration.id, JobNames.Migrations.Contacts);

      return {
        code: 200,
        success: true,
        data: contactsMigration,
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
    const contactsMigration = await Migration.find(migrationId);

    if (!contactsMigration) {
      return null;
    }

    const { positions_mapping, industries_mapping, companyId, fieldsMapped, sourceId } = contactsMigration.config;
    const fileBuffer = await getFileBuffer(contactsMigration.url);
    const book = Excel.read(fileBuffer);
    const sheet = book.Sheets[book.SheetNames[0]];

    const data = Excel.utils.sheet_to_json(sheet);

    const { errorsFound,successUploads, success, error } = await this.contactsMigrationProcess.start(
      migrationId,
      data,
      industries_mapping,
      positions_mapping,
      companyId,
      fieldsMapped, 
      sourceId
    );

    return {
      errorsFound,
      contactsMigration,
      successUploads,
      success, 
      error
    };
  }

  async migrationProgress(migrationId) {
    return await migrationProgress(migrationId);
  }

}

module.exports = ContactsMigrationRepository;
