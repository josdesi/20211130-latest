'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database');
const { fileType } = use('App/Helpers/FileType');
class FileTypesSchema extends Schema {
  up () {
    this.table('file_types', (table) => {
      // alter table
    })

    this.schedule(async (transaction) => {
      try {
        const query = `
        INSERT INTO 
          company_has_files (
            company_id,
            file_type_id,
            url,
            file_name,
            created_at, 
            updated_at,
            created_by
          )
        SELECT 
          cp.id,
          ${fileType('ATTACHMENT')},
          cp.fee_agreement_url,
          cp.file_name,
          cp.created_at,
          cp.created_at,
          COALESCE(cp.created_by, cp.recruiter_id)
        FROM companies cp
        WHERE cp.fee_agreement_url IS NOT NULL AND cp.file_name IS NOT NULL`;
        await Database.raw(query).transacting(transaction);
        await transaction.commit();
      } catch(ex) {
        await transaction.rollback();
        throw ex;
      }
    });
  }

  down () {
    this.table('file_types', (table) => {
      // reverse alternations
    })
  }
}

module.exports = FileTypesSchema
