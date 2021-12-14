'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class CompanyFeeAgreementsSchema extends Schema {
  up () {
    this.table('company_fee_agreements', (table) => {
      table.timestamp('tracking_sent_to_sign_date');
      table.timestamp('tracking_signed_date');
    })
  }

  down () {
    this.table('company_fee_agreements', (table) => {
      table.dropColumn('tracking_sent_to_sign_date');
      table.dropColumn('tracking_signed_date');
    })
  }
}

module.exports = CompanyFeeAgreementsSchema
