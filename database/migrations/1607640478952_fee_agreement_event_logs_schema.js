'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
class FeeAgreementEventLogsSchema extends Schema {
  up () {
    this.table('fee_agreement_event_logs', (table) => {
      table.timestamp('real_date');
    })
  }

  down () {
    this.table('fee_agreement_event_logs', (table) => {
      table.dropColumn('real_date');
    })
  }
}

module.exports = FeeAgreementEventLogsSchema
