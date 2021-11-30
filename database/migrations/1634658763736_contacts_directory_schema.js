'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class ContactsDirectorySchema extends Schema {
  up() {
    this.table('contacts_directory', (table) => {
      // alter table
      table.timestamp('last_activity_date');
      table.string('last_activity_recruiter', 256);
      table.string('last_activity_title', 100);
    });
  }

  down() {
    this.table('contacts_directory', (table) => {
      // reverse alternations
      table.dropColumn('last_activity_date');
      table.dropColumn('last_activity_recruiter');
      table.dropColumn('last_activity_title');
    });
  }
}

module.exports = ContactsDirectorySchema;
