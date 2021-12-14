'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class UnsubscribeReasonSchema extends Schema {
  up() {
    this.table('unsubscribe_reasons', (table) => {
      // alter table
      table.boolean('needs_custom_reason').defaultTo(false);
    });
  }

  down() {
    this.table('unsubscribe_reasons', (table) => {
      // reverse alternations
      table.dropColumn('needs_custom_reason');
    });
  }
}

module.exports = UnsubscribeReasonSchema;
