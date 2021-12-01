'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class CompanyFeeAgreementsSchema extends Schema {
  up () {
    this.table('company_fee_agreements', (table) => {
      table.timestamp('last_resend_time');
    })
  }

  down () {
    this.table('company_fee_agreements', (table) => {
      table.dropColumn('last_resend_time');
    })
  }
}

module.exports = CompanyFeeAgreementsSchema
