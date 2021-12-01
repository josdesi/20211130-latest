'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class SourceMigrationCompanySchema extends Schema {
  up () {
    this.table('companies', (table) => {
      table.integer('migration_source_type_id')
        .references('id')
        .inTable('migration_source_types');
      table.renameColumn('pcr_record','migration_record');
      table.renameColumn('pcr_record_changed','migration_record_changed');
    })
  }

  down () {
    this.table('companies', (table) => {
      // reverse alternations
      table.dropColumn('migration_source_type_id');
      table.renameColumn('migration_record','pcr_record');
      table.renameColumn('migration_record_changed','pcr_record_changed');
    })
  }
}

module.exports = SourceMigrationCompanySchema
