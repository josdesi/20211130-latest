'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class NameSchema extends Schema {
  up () {
    this.table('names', (table) => {
      // alter table
      table.string('pcr_status');
    })
  }

  down () {
    this.table('names', (table) => {
      // reverse alternations
      table.dropColumn('pcr_status');
    })
  }
}

module.exports = NameSchema
