'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
class FeeAgreementStatusesSchema extends Schema {
  up () {
    this.table('fee_agreement_statuses', (table) => {
      table.boolean('hidden');
    })
  }

  down () {
    this.table('fee_agreement_statuses', (table) => {
      // reverse alternations
      table.dropColumn('hidden');
    })
  }
}

module.exports = FeeAgreementStatusesSchema
