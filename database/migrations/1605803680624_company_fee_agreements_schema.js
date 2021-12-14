'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class CompanyFeeAgreementsSchema extends Schema {
  up () {
    this.table('company_fee_agreements', (table) => {
      table.string('fee_agreement_payment_scheme_id', 20)
        .references('id')
        .inTable('fee_agreement_payment_schemes');
      table.float('flat_fee_amount');
    })
  }

  down () {
    this.table('company_fee_agreements', (table) => {
      table.dropColumn('fee_agreement_payment_scheme_id');
      table.dropColumn('flat_fee_amount');
    })
  }
}

module.exports = CompanyFeeAgreementsSchema
