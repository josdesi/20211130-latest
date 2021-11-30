'use strict';

//Utils
const appInsights = use('applicationinsights');
const Database = use('Database');
const { searchProjectFieldColumns, getFieldsBytype } = use('App/Helpers/Migration/Constants');


//Repositories
const SearchProjectMigrationRepository = new (use('App/Helpers/Migration/SearchProjectMigrationRepository'))();
const { migrationFile, createMigrationLog } = use('App/Helpers/Migration/MigrationUtils');
const { migrationType, multipartConfig } = use('App/Helpers/Globals');

class SearchProjectMigrationController {
  /**
   * Upload file
   * POST file
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async createMigration({ auth, request, response }) {
    try {
      const user_id = auth.current.user.id;
  
      request.multipart.file('migration_file', multipartConfig, async (file) => {
        const migration = await migrationFile(file, getFieldsBytype(searchProjectFieldColumns,'PCR'));
        if (!migration.success) {
          return response.status(migration.status).send(migration);
        }
        const fileData = {
          absolutePath: migration.absolutePath,
          fileName: migration.fileName,
          originalName: migration.originalName,
          extname: file.extname
        }

        const searchProjectMigration = await SearchProjectMigrationRepository.create(
          fileData,
          user_id
        );

        await createMigrationLog({
          id: searchProjectMigration.id,
          description: 'Migration search project created',
          progress: 0,
          type: migrationType.SearchProject,
        });
        await Database.table('migrations').where('id', searchProjectMigration.id).update({ status: 'created' });

        const { columnsFile = [], fieldsMapped } = migration;
        return response.ok({
            searchProjectMigration,
            columnsFile,
            fieldsMapped
        });
      });

      await request.multipart.process();
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return response.status(500).send({
        message: 'There was a problem uploading the file, please try again later',
      });
    }
  }

  /**
   * Update Config
   * PUT config
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
   async updateConfig({ params, request, response }) {
    const { searchProjectId, isPrivate, userId, name, is_high_priority, is_new_sp, fieldsMapped } = request.only([
      'searchProjectId',
      'isPrivate',
      'userId',
      'name',
      'is_new_sp',
      'is_high_priority',
      'fieldsMapped',
    ]);
    const result = await SearchProjectMigrationRepository.updateConfigData(params.id, {
      existingId: searchProjectId,
      isPrivate,
      recruiterId: userId,
      name,
      is_high_priority,
      isANewSP: is_new_sp,
      fieldsMapped,
    });

    return response.status(result.code).send(result.success ? result.data : result);
  }

    /**
   * Migration progress search projects
   * GET migration id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
     async migrationProgress({ params, response }) {
      const result = await SearchProjectMigrationRepository.migrationProgress(params.id);
      return response.status(result.code).send(result.success ? result.data : result);
    }
}

module.exports = SearchProjectMigrationController;
