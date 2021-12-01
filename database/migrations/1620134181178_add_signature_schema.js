'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class AddSignatureSchema extends Schema {
  up () {
    this.table('users', (table) => {
      // alter table
      table.text('email_signature');
    })
  }

  down () {
    this.table('users', (table) => {
      // reverse alternations
      table.dropColumn('email_signature');
    })
  }
}

module.exports = AddSignatureSchema
