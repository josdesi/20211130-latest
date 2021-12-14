'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class UserSchema extends Schema {
  up () {
    this.table('users', (table) => {
      table.dropColumn('token_notification');
    })
  }

  down () {
    this.table('users', (table) => {
      table.text('token_notification');
    })
  }
}

module.exports = UserSchema
