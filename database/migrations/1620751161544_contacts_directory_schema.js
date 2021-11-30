'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class ContactsDirectorySchema extends Schema {
  up () {
    this.table('contacts_directory', (table) => {
      table.specificType('coordinates', 'GEOGRAPHY(POINT,4326)');
    })
  }

  down () {
    this.table('contacts_directory', (table) => {
      table.dropColumn('coordinates');
    })
  }
}

module.exports = ContactsDirectorySchema
