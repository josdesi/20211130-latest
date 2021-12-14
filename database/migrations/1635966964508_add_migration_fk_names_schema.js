'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class AddMigrationFkNamesSchema extends Schema {
  up () {
    this.table('names', (table) => {
      // alter table
      table.integer('migration_id')
        .references('id')
        .inTable('migrations');
    })
  }

  down () {
    this.table('names', (table) => {
      // reverse alternations
      table.dropColumn('migration_id');
    })
  }
}

module.exports = AddMigrationFkNamesSchema
