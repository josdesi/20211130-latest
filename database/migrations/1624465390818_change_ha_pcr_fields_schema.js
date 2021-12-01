'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class ChangeHaPcrFieldsSchema extends Schema {
  up () {
    this.table('hiring_authorities', (table) => {
      // alter table
      table.integer('migration_source_type_id')
        .references('id')
        .inTable('migration_source_types');
      table.renameColumn('pcr_record','migration_record');
      table.renameColumn('pcr_status','migration_status');
    })
  }

  down () {
    this.table('hiring_authorities', (table) => {
      // reverse alternations
      table.dropColumn('migration_source_type_id');
      table.renameColumn('migration_record','pcr_record');
      table.renameColumn('migration_status','pcr_status');
    })
  }
}

module.exports = ChangeHaPcrFieldsSchema
