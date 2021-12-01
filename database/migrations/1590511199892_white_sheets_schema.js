'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class WhiteSheetsSchema extends Schema {
  up () {
    this.table('white_sheets', (table) => {
      // alter table
      table.integer('warranty_time_in_days').notNullable().default(30);
    })
  }

  down () {
    this.table('white_sheets', (table) => {
      // reverse alternations
      table.dropColumn('warranty_time_in_days');
    })
  }
}

module.exports = WhiteSheetsSchema
