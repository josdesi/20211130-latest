'use strict';

//Utils
const { getFileBuffer } = use('App/Helpers/FileHelper');
const { JobNames } = use('App/Scheduler/Constants');
const Excel = require('xlsx');
const {  migrationProgress, scheduleTask, getColumnsDataSheet } = use('App/Helpers/Migration/MigrationUtils');
const { sourceTypes } = use('App/Helpers/Migration/Constants');
const { find } = use('lodash');

//Models
const Migration = use('App/Models/Migration');

//Repositories
const NameMigrationProcess = use('App/Helpers/Migration/NameMigrationProcess');
const SearchProjectRepository = use('App/Helpers/SearchProjectRepository');
const SearchProjectInventoryRepository =  use('App/Helpers/SearchProjectInventoryRepository');

class SearchProjectMigrationRepository {

  constructor(){
    this.nameMigrationProcess = new NameMigrationProcess();
    this.searchProjectInventoryRepository = new SearchProjectInventoryRepository();
    this.searchProjectRepository = new SearchProjectRepository();
  }

  async create(fileData, userId) {
    const {  absolutePath, fileName, originalName, extname } = fileData;
    const searchProjectMigration = await Migration.create({
      url: absolutePath,
      file_name: fileName,
      original_name: `${originalName}.${extname}`,
      created_by: userId,
      type: 'search-project'
    });
    return searchProjectMigration;
  }

  async updateConfigData(
    migrationId,
    { existingId, isPrivate, recruiterId, name, is_high_priority, isANewSP, fieldsMapped }
  ) {
    try {
      const searchProjectMigration = await Migration.find(migrationId);
      if (!searchProjectMigration) {
        return {
          success: false,
          code: 400,
          message: "The migration file doesn't exist",
        };
      }
      const fieldsColumn = {};
      const fileBuffer = await getFileBuffer(searchProjectMigration.url);
      const book = Excel.read(fileBuffer);
      const sheet = book.Sheets[book.SheetNames[0]];
      const columnsFile = getColumnsDataSheet(sheet);

      for (const property in fieldsMapped) {
        const { columnKey  } = fieldsMapped[property];
        const columnInfo = find(columnsFile, { id: columnKey });
        fieldsColumn[property] = columnInfo ? columnInfo.title : null;
      }
      
      searchProjectMigration.config = {
        ...searchProjectMigration.config,
        recruiterId,
        existingId,
        fieldsMapped: fieldsColumn,
        isPrivate,
        isANewSP,
        name,
      };
      searchProjectMigration.status = 'config-completed';
      searchProjectMigration.is_high_priority = is_high_priority;
      await searchProjectMigration.save();
      is_high_priority && (await scheduleTask(searchProjectMigration.id, JobNames.Migrations.SearchProject));

      return {
        code: 200,
        success: true,
        data: searchProjectMigration,
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
    let searchProjectResult;
    const searchProjectMigration = await Migration.find(migrationId);
    if (!searchProjectMigration) {
      return null;
    }
    const { isANewSP, name, isPrivate, recruiterId, existingId, fieldsMapped } = searchProjectMigration.config;
    const fileBuffer = await getFileBuffer(searchProjectMigration.url);
    const book = Excel.read(fileBuffer);
    const sheet = book.Sheets[book.SheetNames[0]];

    const data = Excel.utils.sheet_to_json(sheet);
    const { candidatesId, namesId, hiringsId, errorsFound, successUploads, success } = await this.nameMigrationProcess.start(migrationId, data, fieldsMapped);
    const inventoryData = {
      candidates: candidatesId,
      hiring_authorities: hiringsId,
      names: namesId,
    };
    if (!isANewSP && Number.isSafeInteger(existingId)) {
      searchProjectResult = await this.searchProjectInventoryRepository.update(
        searchProjectMigration.config.existingId,
        inventoryData,
        recruiterId
      );
    } else {
      searchProjectResult = await this.searchProjectRepository.create(
        {
          name,
          is_private: isPrivate,
          migration_record: true,
          migration_source_type_id: sourceTypes.PCR.id,
          migration_id: migrationId
        },
        inventoryData,
        recruiterId
      );
    }
    if(!searchProjectResult.success){
      return {
        success : false,
        error: searchProjectResult.message || searchProjectResult.error
      }
    }
    return {
      searchProjectMigration,
      errorsFound,
      searchProjectResult,
      successUploads,
      success
    };
  }


  async migrationProgress(migrationId) {
    return await migrationProgress(migrationId);
  }
}

module.exports = SearchProjectMigrationRepository;
