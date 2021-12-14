'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const { sourceTypes } = use('App/Helpers/Migration/Constants');

class UpdateMigrationTypeOnsSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      const updateTypes = `
        UPDATE companies SET migration_source_type_id = ${sourceTypes.PCR.id} WHERE migration_record = true;
        UPDATE candidates SET migration_source_type_id = ${sourceTypes.PCR.id} WHERE migration_record = true;
        UPDATE names SET migration_source_type_id = ${sourceTypes.PCR.id} WHERE migration_record = true;
        UPDATE hiring_authorities SET migration_source_type_id = ${sourceTypes.PCR.id} WHERE migration_record = true;
        UPDATE search_projects SET migration_source_type_id = ${sourceTypes.PCR.id} WHERE migration_record = true; 
      `;
      try {
        await transaction.raw(updateTypes);
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    });
  }
}

module.exports = UpdateMigrationTypeOnsSchema
