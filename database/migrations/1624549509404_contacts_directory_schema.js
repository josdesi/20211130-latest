'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class ContactsDirectorySchema extends Schema {
  up () {
    this.table('contacts_directory', (table) => {
      // alter table
      table.string('phone', 20);
    })
  }

  down () {
    this.table('contacts_directory', (table) => {
      // reverse alternations
      table.dropColumn('phone');
    })
  }
}

module.exports = ContactsDirectorySchema
