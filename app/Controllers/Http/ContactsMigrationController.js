'use strict';

// Utils
const appInsights = use('applicationinsights');
const Database = use('Database');
const { contactsFieldColumns, sourceTypes, getFieldsBytype } = use('App/Helpers/Migration/Constants');

// Repositories
const ContactsMigrationRepository = new (use('App/Helpers/Migration/ContactsMigrationRepository'))();
const {  migrationFile, createMigrationLog } = use('App/Helpers/Migration/MigrationUtils');
const { migrationType, multipartConfig } = use('App/Helpers/Globals');

class ContactsMigrationController {
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
        let contactFields = {};
        const companyId = params['companyId'] ? Number(params['companyId']) : null;
        const sourceId = params['sourceId'] ? Number(params['sourceId']) : null;
         
        if(sourceId === sourceTypes.PCR.id){
          contactFields = getFieldsBytype(contactsFieldColumns, 'PCR');
        }else{
          contactFields = getFieldsBytype(contactsFieldColumns, 'ZoomInfo');
        }
        if(companyId){
          delete contactFields.companyId;
        }

        const migration = await migrationFile(file, contactFields);

        if (migration.success) {
          const contactsMigration = await ContactsMigrationRepository.create(
            migration.absolutePath,
            migration.fileName,
            migration.originalName,
            file.extname,
            user_id,
            companyId,
            sourceId
          );

          await createMigrationLog({
            id: contactsMigration.id,
            description: 'Migration contacts created',
            progress: 0,
            type: migrationType.Contact,
          });
          await Database.table('migrations').where('id', contactsMigration.id).update({ status: 'created' });

          
          const { columnsFile = [], fieldsMapped } = migration;
          return response.ok({
            contactsMigration,
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
    const result = await ContactsMigrationRepository.updateIndustriesData(
      params.id,
      request.input('industries_mapping')
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
    const result = await ContactsMigrationRepository.updateColumnsData(params.id, fieldsMapped, columnsFile);

    return response.status(result.code).send(result.success ? result.data : result);
  }

  /**
   * Update Position
   * PUT Position
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async updatePosition({ params, request, response }) {
    const {
      positions_mapping,
      is_high_priority
    } = request.only(['positions_mapping','is_high_priority'])
    const result = await ContactsMigrationRepository.updatePositionData(
      params.id, 
      positions_mapping,
      is_high_priority
    );

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
    const result = await ContactsMigrationRepository.migrationProgress(params.id);
    return response.status(result.code).send(result.success ? result.data : result);
  }

}

module.exports = ContactsMigrationController;
