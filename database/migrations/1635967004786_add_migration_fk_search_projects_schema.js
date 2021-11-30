'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class AddMigrationFkSearchProjectsSchema extends Schema {
  up () {
    this.table('search_projects', (table) => {
      // alter table
      table.integer('migration_id')
        .references('id')
        .inTable('migrations');
    })
  }

  down () {
    this.table('search_projects', (table) => {
      // reverse alternations
      table.dropColumn('migration_id');
    })
  }
}

module.exports = AddMigrationFkSearchProjectsSchema
