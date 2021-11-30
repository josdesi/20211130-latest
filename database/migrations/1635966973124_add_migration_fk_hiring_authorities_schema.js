'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class AddMigrationFkHiringAuthoritiesSchema extends Schema {
  up () {
    this.table('hiring_authorities', (table) => {
      // alter table
      table.integer('migration_id')
        .references('id')
        .inTable('migrations');
    })
  }

  down () {
    this.table('hiring_authorities', (table) => {
      // reverse alternations
      table.dropColumn('migration_id');
    })
  }
}

module.exports = AddMigrationFkHiringAuthoritiesSchema
