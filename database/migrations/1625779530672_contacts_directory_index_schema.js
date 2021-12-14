'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class ContactsDirectoryIndexSchema extends Schema {
  up () {
    this.table('contacts_directory', (table) => {
      // alter table
      table.index('phone');
    })
  }

  down () {
    this.table('contacts_directory', (table) => {
      // reverse alternations
      table.dropIndex('phone');
    })
  }
}

module.exports = ContactsDirectoryIndexSchema
