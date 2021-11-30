'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class WhiteSheetSchema extends Schema {
  up () {
    this.table('white_sheets', (table) => {
      // alter table
      table.float('minimum_compensation').alter();
      table.float('good_compensation').alter();
      table.float('maximum_compensation').alter();
    })
  }

  down () {
    this.table('white_sheets', (table) => {
      // reverse alternations
    })
  }
}

module.exports = WhiteSheetSchema
