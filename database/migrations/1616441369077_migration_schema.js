'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class MigrationSchema extends Schema {
  up () {
    this.table('migrations', (table) => {
      table.boolean('is_high_priority').defaultTo(true);
    })
  }

  down () {
    this.table('migrations', (table) => {
      table.dropColumn('is_high_priority');
    })
  }
}

module.exports = MigrationSchema
