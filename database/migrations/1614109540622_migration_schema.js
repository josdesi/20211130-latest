'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class MigrationSchema extends Schema {
  up () {
    this.table('migrations', (table) => {
      table.string('status');
      table.integer('items_processed');
      table.integer('items_error');
    })
  }

  down () {
    this.table('migrations', (table) => {
      // reverse alternations
      table.dropColumn('status');
      table.dropColumn('items_processed');
      table.dropColumn('items_error');
    })
  }
}

module.exports = MigrationSchema
