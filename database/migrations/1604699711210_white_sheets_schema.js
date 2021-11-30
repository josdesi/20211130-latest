'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class WhiteSheetsSchema extends Schema {
  up () {
    this.table('white_sheets', (table) => {
      table.integer('company_fee_agreement_id').references('id').inTable('company_fee_agreements');
    })
  }

  down () {
    this.table('white_sheets', (table) => {
      table.dropColumn('company_fee_agreement_id')
    })
  }
}

module.exports = WhiteSheetsSchema
