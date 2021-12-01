'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class EmailUserUnsubscribeSchema extends Schema {
  up() {
    this.table('email_user_unsubscribes', (table) => {
      // alter table
      table.text('notes');
    });
  }

  down() {
    this.table('email_user_unsubscribes', (table) => {
      // reverse alternations
      table.dropColumn('notes');
    });
  }
}

module.exports = EmailUserUnsubscribeSchema;
