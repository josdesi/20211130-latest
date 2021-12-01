'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class DocusignAuditEventsSchema extends Schema {
  up () {
    this.create('docusign_audit_events', (table) => {
      table.integer('fee_agreement_id').references('id').inTable('company_fee_agreements');
      table.string('id', 512).primary();
      table.string('envelope_id');
      table.string('action', 64);
      table.jsonb('data');
      table.timestamp('real_date');
      table.timestamps()
    })
  }

  down () {
    this.drop('docusign_audit_events')
  }
}

module.exports = DocusignAuditEventsSchema
