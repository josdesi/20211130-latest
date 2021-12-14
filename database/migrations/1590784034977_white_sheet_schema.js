'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class WhiteSheetSchema extends Schema {
  up () {
    this.table('white_sheets', (table) => {
      // alter table
      table.float('fee_agreement_percent').alter();
    })
  }

  down () {
    this.table('white_sheets', (table) => {
      // reverse alternations
      table.integer('fee_agreement_percent').alter();
    })
  }
}

module.exports = WhiteSheetSchema
