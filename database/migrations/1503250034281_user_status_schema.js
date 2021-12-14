'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class UserStatusSchema extends Schema {
  up () {
    this.create('user_statuses', (table) => {
      table.increments()
      table.string('title',50).notNullable()
      table.integer('created_by')
      table.integer('updated_by')
      table.timestamps()
    })
  }

  down () {
    this.drop('user_statuses')
  }
}

module.exports = UserStatusSchema
