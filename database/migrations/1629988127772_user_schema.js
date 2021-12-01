'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class UserSchema extends Schema {
  up () {
    this.table('users', (table) => {
      // alter table
      table.timestamp('start_date');
    })
  }

  down () {
    this.table('users', (table) => {
      // reverse alternations
      table.dropColumn('start_date');
    })
  }
}

module.exports = UserSchema
