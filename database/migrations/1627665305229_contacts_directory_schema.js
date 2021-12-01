'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class ContactsDirectorySchema extends Schema {
  up() {
    this.table('contacts_directory', (table) => {
      // alter table
      table.integer('recruiter_id').references('id').inTable('users');
    });
  }

  down() {
    this.table('contacts_directory', (table) => {
      // reverse alternations
      table.dropColumn('recruiter_id');
    });
  }
}

module.exports = ContactsDirectorySchema;
