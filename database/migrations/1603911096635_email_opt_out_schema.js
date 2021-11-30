'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class EmailOptOutSchema extends Schema {
  up() {
    this.table('email_opt_outs', (table) => {
      // alter table
      table.integer('unsubscribe_reason_id').unsigned().references('id').inTable('unsubscribe_reasons');
      table.text('custom_reason'); //It is expected that unsubscribe_reason_id will be 'other' & a custom_reason will be typed
    });
  }

  down() {
    this.table('email_opt_outs', (table) => {
      // reverse alternations
      table.drop('unsubscribe_reason_id');
      table.drop('custom_reason');
    });
  }
}

module.exports = EmailOptOutSchema;
