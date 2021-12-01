'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class WhiteSheetsSchema extends Schema {
  up () {
    this.table('white_sheets', (table) => {
      // alter table
      table.dropColumn('first_year_compensation');
    })
  }

  down () {
    this.table('white_sheets', (table) => {
      // reverse alternations
      table.specificType('first_year_compensation', 'real');
    })
  }
}

module.exports = WhiteSheetsSchema
