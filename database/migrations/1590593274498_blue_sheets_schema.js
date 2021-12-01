'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class BlueSheetsSchema extends Schema {
  up () {
    this.table('blue_sheets', (table) => {
      // alter table
      table.dropColumn('make_a_change');
    })
  }

  down () {
    this.table('blue_sheets', (table) => {
      // reverse alternations
      table.specificType('make_a_change', 'smallint');
    })
  }
}

module.exports = BlueSheetsSchema
