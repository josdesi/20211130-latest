'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class AddMigrationFkCompaniesSchema extends Schema {
  up () {
    this.table('companies', (table) => {
      // alter table
      table.integer('migration_id')
        .references('id')
        .inTable('migrations');
    })
  }

  down () {
    this.table('companies', (table) => {
      // reverse alternations
      table.dropColumn('migration_id');
    })
  }
}

module.exports = AddMigrationFkCompaniesSchema
