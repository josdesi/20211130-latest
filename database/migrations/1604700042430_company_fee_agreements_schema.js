'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class CompanyFeeAgreementsSchema extends Schema {
  up () {
    this.table('company_fee_agreements', (table) => {
      table.string('subject');
    })
  }

  down () {
    this.table('company_fee_agreements', (table) => {
      table.dropColumn('subject');
    })
  }
}

module.exports = CompanyFeeAgreementsSchema
