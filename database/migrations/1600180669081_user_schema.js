'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class UserSchema extends Schema {
  up () {
    this.table('users', (table) => {
      // alter table
      table.string('job_title',50)
    })
  }

  down () {
    this.table('users', (table) => {
      // reverse alternations
      table.dropColumn('job_title',50)
    })
  }
}

module.exports = UserSchema
