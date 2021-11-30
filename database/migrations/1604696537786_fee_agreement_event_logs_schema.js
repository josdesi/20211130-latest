'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class FeeAgreementEventLogsSchema extends Schema {
  up () {
    this.create('fee_agreement_event_logs', (table) => {
      table.increments()
      table.integer('fee_agreement_id')
        .references('id')
        .inTable('company_fee_agreements');

      table.integer('triggered_by_user_id')
        .references('id')
        .inTable('users');

      table.integer('result_fee_agreement_status_id')
        .references('id')
        .inTable('fee_agreement_statuses');

      table.integer('event_type_id')
        .references('id')
        .inTable('fee_agreement_event_types');

      table.jsonb('event_details');

      table.timestamps()
    })
  }

  down () {
    this.drop('fee_agreement_event_logs')
  }
}

module.exports = FeeAgreementEventLogsSchema
