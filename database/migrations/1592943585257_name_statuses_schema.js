'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class NameStatusesSchema extends Schema {
  up () {
    this.table('name_statuses', (table) => {
      table.integer('original_table_id');
    })
  }

  down () {
    this.table('name_statuses', (table) => {
      table.dropColumn('original_table_id');
    })
  }
}

module.exports = NameStatusesSchema
