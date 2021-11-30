'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class UsersSchema extends Schema {
  up () {
    this.table('users', (table) => {
      // alter table
      table
        .integer('manager_id').unsigned()
        .references('id')
        .on('users')
    })
  }

  down () {
    this.table('users', (table) => {
      table.dropColumn('manager_id')
    })
  }
}

module.exports = UsersSchema
