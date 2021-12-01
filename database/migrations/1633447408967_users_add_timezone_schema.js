'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class UsersAddTimezoneSchema extends Schema {
  up () {
    this.table('users', (table) => {
      // alter table
      table.string('timezone', 50);
    })
  }

  down () {
    this.table('users', (table) => {
      // reverse alternations
      table.dropColumn('timezone');
    })
  }
}

module.exports = UsersAddTimezoneSchema
