'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class ContactsDirectoryMobileSchema extends Schema {
  up () {
    this.table('contacts_directory', (table) => {
      // alter table
      table.string('mobile', 20).index();
    })
  }

  down () {
    this.table('contacts_directory', (table) => {
      // reverse alternations
      table.dropColumn('mobile');
    })
  }
}

module.exports = ContactsDirectoryMobileSchema
