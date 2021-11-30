'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class EmailUserUnsubscribeSchema extends Schema {
  up() {
    this.table('email_user_unsubscribes', (table) => {
      // alter table
      table.integer('created_by').unsigned().references('id').inTable('users');
    });
  }

  down() {
    this.table('email_user_unsubscribes', (table) => {
      // reverse alternations
      table.dropColumn('created_by');
    });
  }
}

module.exports = EmailUserUnsubscribeSchema;
