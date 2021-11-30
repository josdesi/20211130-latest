'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class ChangeNamePcrFieldsSchema extends Schema {
  up () {
    this.table('names', (table) => {
      // alter table
      table.integer('migration_source_type_id')
        .references('id')
        .inTable('migration_source_types');
      table.renameColumn('pcr_record','migration_record');
      table.renameColumn('pcr_record_changed','migration_record_changed');
      table.renameColumn('pcr_status','migration_status');
    })
  }

  down () {
    this.table('names', (table) => {
      // reverse alternations
      table.dropColumn('migration_source_type_id');
      table.renameColumn('migration_record','pcr_record');
      table.renameColumn('migration_record_changed','pcr_record_changed');
      table.renameColumn('migration_status','pcr_status');
    })
  }
}

module.exports = ChangeNamePcrFieldsSchema
