'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class EmailHistorySchema extends Schema {
  up() {
    this.table('email_histories', (table) => {
      // alter table
      table.integer('bulk_email_scope_type_id').unsigned().references('id').inTable('bulk_email_scope_types');
    });
  }

  down() {
    this.table('email_histories', (table) => {
      // reverse alternations
      this.dropColumn('bulk_email_scope_type_id');
    });
  }
}

module.exports = EmailHistorySchema;
