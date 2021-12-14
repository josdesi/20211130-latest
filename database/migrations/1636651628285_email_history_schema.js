'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class EmailHistorySchema extends Schema {
  up() {
    this.table('email_histories', (table) => {
      // alter table
      table.json('search_project_selection_params');
    });
  }

  down() {
    this.table('email_histories', (table) => {
      // reverse alternations
      table.dropColumn('search_project_selection_params');
    });
  }
}

module.exports = EmailHistorySchema;
