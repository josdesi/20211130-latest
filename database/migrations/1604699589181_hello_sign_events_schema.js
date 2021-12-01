'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class HelloSignEventsSchema extends Schema {
  up () {
    this.create('hello_sign_events', (table) => {
      table.string('id', 100).primary();
      table.integer('fee_agreement_id').references('id').inTable('company_fee_agreements');
      table.jsonb('data').notNullable();
      table.timestamp('real_date', false);
      table.timestamps();
    })
  }

  down () {
    this.drop('hello_sign_events')
  }
}

module.exports = HelloSignEventsSchema
