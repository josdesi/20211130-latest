'use strict';

// Utils
const appInsights = use('applicationinsights');
const Database = use('Database');
const { listing } = use('App/Helpers/Migration/MigrationUtils');
const { companyFieldColumns, sourceTypes, getFieldsBytype } = use('App/Helpers/Migration/Constants');

// Repositories
const CompanyMigrationRepository = new (use('App/Helpers/Migration/CompanyMigrationRepository'))();
const { migrationFile, createMigrationLog } = use('App/Helpers/Migration/MigrationUtils');
const { migrationType, multipartConfig } = use('App/Helpers/Globals');
class CompanyMigrationController {
  /**
   * Upload file
   * POST file
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async uploadMigrationFile({ auth, request, response, params }) {
    try {
      const user_id = auth.current.user.id;

      request.multipart.file('migration_file', multipartConfig, async (file) => {    
        let companyFields = {};
        const sourceId = Number(params['sourceId']);
        if(sourceId === sourceTypes.PCR.id){
          companyFields = getFieldsBytype(companyFieldColumns, 'PCR');
        }else{
          companyFields = getFieldsBytype(companyFieldColumns, 'ZoomInfo');
        }
        const migration = await migrationFile(file, companyFields);
        if (migration.success) {
          const companyMigration = await CompanyMigrationRepository.create(
            migration.absolutePath,
            migration.fileName,
            migration.originalName,
            file.extname,
            user_id,
            sourceId
          );

          await createMigrationLog({
            id: companyMigration.id,
            description: 'Migration companies created',
            progress: 0,
            type: migrationType.Company,
          });
          await Database.table('migrations').where('id', companyMigration.id).update({ status: 'created' });

          const { columnsFile = [], fieldsMapped } = migration;
          return response.ok({
            companyMigration,
            columnsFile,
            fieldsMapped
          });
        }

        return response.status(migration.status).send(migration);
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
   * Update Industries Array Map
   * PUT industries_mapping
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async updateIndustriesMapping({ params, request, response }) {
    const {
      industries_mapping,
      is_high_priority
    } = request.only(['industries_mapping','is_high_priority']);
    const result = await CompanyMigrationRepository.updateIndustriesData(
      params.id,
      industries_mapping,
      is_high_priority
    );

    return response.status(result.code).send(result.success ? result.data : result);
  }

    /**
   * Update Columns Array Map
   * PUT columns_mapping
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async updateColumnsMap({ params, request, response }) {
    const { fieldsMapped, columnsFile} = request.only(['fieldsMapped','columnsFile']);
    const result = await CompanyMigrationRepository.updateColumnsData(params.id, fieldsMapped, columnsFile);

    return response.status(result.code).send(result.success ? result.data : result);
  }

  /**
   * Migration progress companies
   * GET migration id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async migrationProgress({ params, response }) {
    const result = await CompanyMigrationRepository.migrationProgress(params.id);
    return response.status(result.code).send(result.success ? result.data : result);
  }

    /**
   * Migration progress companies by user
   * GET migration id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async listing({ request , auth, response }) {
    const userId = auth.current.user.id;
    const result = await listing(userId, request.all());
    return response.status(result.code).send(result.success ? result.data : result);
  }
}

module.exports = CompanyMigrationController;
