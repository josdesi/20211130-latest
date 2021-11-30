'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class WhiteSheetSchema extends Schema {
  up () {
    this.table('white_sheets', (table) => {
      // alter table
      table
        .integer('fee_agreement_type_id')
        .nullable()
        .alter();
    })
  }

  down () {
    this.table('white_sheets', (table) => {
      // reverse alternations
    })
  }
}

module.exports = WhiteSheetSchema
