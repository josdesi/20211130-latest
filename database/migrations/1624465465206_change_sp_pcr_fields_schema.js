'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class ChangeSpPcrFieldsSchema extends Schema {
  up () {
    this.table('search_projects', (table) => {
      // alter table
      table.integer('migration_source_type_id')
        .references('id')
        .inTable('migration_source_types');
      table.renameColumn('pcr_record','migration_record');
    })
  }

  down () {
    this.table('search_projects', (table) => {
      // reverse alternations
      table.dropColumn('migration_source_type_id');
      table.renameColumn('migration_record','pcr_record');
    })
  }
}

module.exports = ChangeSpPcrFieldsSchema
