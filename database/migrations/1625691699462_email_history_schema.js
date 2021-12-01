'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class EmailHistorySchema extends Schema {
  up() {
    this.table('email_histories', (table) => {
      // alter table
      table.integer('block_duration_days');
    });
  }

  down() {
    this.table('email_histories', (table) => {
      // reverse alternations
      table.dropColumn('block_duration_days');
    });
  }
}

module.exports = EmailHistorySchema;
