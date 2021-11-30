'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class ContactsDirectorySchema extends Schema {
  up () {
    this.table('contacts_directory', (table) => {
      table.string('searchable_text', 1024);
    })
  }

  down () {
    this.table('contacts_directory', (table) => {
      table.dropColumn('searchable_text');
    })
  }
}

module.exports = ContactsDirectorySchema
