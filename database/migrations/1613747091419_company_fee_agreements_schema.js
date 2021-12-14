'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class CompanyFeeAgreementsSchema extends Schema {
  up () {
    this.table('company_fee_agreements', (table) => {
      table.string('ha_email', 128);
    })
  }

  down () {
    this.table('company_fee_agreements', (table) => {
      // reverse alternations
      table.dropColumn('ha_email');
    })
  }
}

module.exports = CompanyFeeAgreementsSchema
