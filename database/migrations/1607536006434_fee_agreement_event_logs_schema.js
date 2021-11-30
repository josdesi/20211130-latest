'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class FeeAgreementEventLogsSchema extends Schema {
  up () {
    this.table('fee_agreement_event_logs', (table) => {
      table.string('associated_hello_sign_event_id', 128).references('id').inTable('hello_sign_events');
    })
  }

  down () {
    this.table('fee_agreement_event_logs', (table) => {
      table.dropColumn('associated_hello_sign_event_id');
    })
  }
}

module.exports = FeeAgreementEventLogsSchema
