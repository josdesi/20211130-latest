'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class EmailHistorySchema extends Schema {
  up() {
    this.table('email_histories', (table) => {
      // alter table
      table.index('sendgrid_id');
      table.boolean('block_similar_companies').defaultTo(false);
    });
  }

  down() {
    this.table('email_histories', (table) => {
      // reverse alternations
      table.dropIndex('sendgrid_id');
      table.dropColumn('block_similar_companies');
    });
  }
}

module.exports = EmailHistorySchema;
