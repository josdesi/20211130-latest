'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class ContactsDirectorySchema extends Schema {
  up() {
    this.table('contacts_directory', (table) => {
      table.integer('company_type_id').references('id').inTable('company_types');
      table.string('company_type_color');
      table.string('company_type');
    });
  }

  down() {
    this.table('contacts_directory', (table) => {
      table.dropColumn('company_type_id');
      table.dropColumn('company_type_color');
      table.dropColumn('company_type');
    });
  }
}

module.exports = ContactsDirectorySchema;
