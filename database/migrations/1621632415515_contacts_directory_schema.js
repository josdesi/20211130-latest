'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class ContactsDirectorySchema extends Schema {
  up () {
    this.table('contacts_directory', (table) => {
      table.string('personal_email', 255);
    })
  }

  down () {
    this.table('contacts_directory', (table) => {
      table.dropColumn('personal_email');
    })
  }
}

module.exports = ContactsDirectorySchema
