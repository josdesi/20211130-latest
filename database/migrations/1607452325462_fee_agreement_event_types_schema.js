'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class FeeAgreementEventTypesSchema extends Schema {
  up () {
    this.table('fee_agreement_event_types', (table) => {
      table.string('associated_hellosign_event_type', 60);
      table.boolean('show_in_history_log');
    })
  }

  down () {
    this.table('fee_agreement_event_types', (table) => {
      table.dropColumn('associated_hellosign_event_type');
      table.dropColumn('show_in_history_log');
    })
  }
}

module.exports = FeeAgreementEventTypesSchema
