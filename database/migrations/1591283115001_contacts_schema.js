'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class ContactsSchema extends Schema {
  up () {
    this.table('contacts', (table) => {
      table.string('ext', 64).alter();
    })
  }

  down () {
    this.table('contacts', (table) => {
      table.integer('ext').alter();
    })
  }
}

module.exports = ContactsSchema
