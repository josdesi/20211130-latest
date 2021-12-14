'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class EmailHistoryHasBulkScopeSchema extends Schema {
  up() {
    this.create('email_history_has_bulk_scopes', (table) => {
      table.increments();
      table.integer('email_history_id').unsigned().references('id').inTable('email_histories');
      table.integer('bulk_email_scope_type_id').unsigned().references('id').inTable('bulk_email_scope_types');
      table.timestamps();
    });
  }

  down() {
    this.drop('email_history_has_bulk_scopes');
  }
}

module.exports = EmailHistoryHasBulkScopeSchema;
