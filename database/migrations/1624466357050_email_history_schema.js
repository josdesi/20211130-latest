'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class EmailHistorySchema extends Schema {
  up() {
    this.table('email_histories', (table) => {
      // alter table
      table.boolean('block_client_companies').defaultTo(false);
    });
  }

  down() {
    this.table('email_histories', (table) => {
      // reverse alternations
      table.dropColumn('block_client_companies');
    });
  }
}

module.exports = EmailHistorySchema;
