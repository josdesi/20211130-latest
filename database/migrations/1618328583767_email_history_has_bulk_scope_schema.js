'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class EmailHistoryHasBulkScopeSchema extends Schema {
  up() {
    // alter table
    this.drop('email_history_has_bulk_scopes');
  }

  down() {
    // reverse alternations
  }
}

module.exports = EmailHistoryHasBulkScopeSchema;
