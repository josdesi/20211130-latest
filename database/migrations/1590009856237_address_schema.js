'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class AddressSchema extends Schema {
  up () {
    this.table('addresses', (table) => {
      // alter table
      table.string('zip', 8).nullable().alter()
    })
  }

  down () {
    this.table('addresses', (table) => {
      // reverse alternations
    })
  }
}

module.exports = AddressSchema
