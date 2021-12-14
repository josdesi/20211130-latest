'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class AddGuaranteeDaysPlacementSchema extends Schema {
  up () {
    this.table('placements', (table) => {
      // alter table
      table.integer('guarantee_days');
      table.integer('company_fee_agreement_id')
        .references('id')
        .inTable('company_fee_agreements');
    })
  }

  down () {
    this.table('placements', (table) => {
      // reverse alternations
      table.dropColumn('guarantee_days');
      table.dropColumn('company_fee_agreement_id');
    })
  }
}

module.exports = AddGuaranteeDaysPlacementSchema
