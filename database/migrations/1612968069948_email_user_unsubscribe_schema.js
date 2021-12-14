'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class EmailUserUnsubscribeSchema extends Schema {
  up() {
    this.table('email_user_unsubscribes', (table) => {
      // alter table
      table.string('sendgrid_timestamp', 20);
    });
  }

  down() {
    this.table('email_user_unsubscribes', (table) => {
      // reverse alternations
      table.dropColumn('sendgrid_timestamp');
    });
  }
}

module.exports = EmailUserUnsubscribeSchema;
