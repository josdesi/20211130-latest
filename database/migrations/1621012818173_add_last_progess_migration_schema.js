'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class AddLastProgessMigrationSchema extends Schema {
  up () {
    this.table('migrations', (table) => {
      // alter table
      table.integer('last_progress').defaultTo(0);
    })
  }

  down () {
    this.table('migrations', (table) => {
      // reverse alternations
      table.dropColumn('last_progress');
    })
  }
}

module.exports = AddLastProgessMigrationSchema
