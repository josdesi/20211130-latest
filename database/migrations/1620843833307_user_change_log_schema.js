'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class UserChangeLogSchema extends Schema {
  up () {
    this.create('user_change_logs', (table) => {
      table.increments()
      table.integer('user_id').unsigned().notNullable().references('id').inTable('users');
      table.integer('created_by').references('id').inTable('users');
      table.string('entity', 16).notNullable();
      table.string('operation', 16).notNullable();
      table.jsonb('payload');
      table.timestamps()
    })
  }

  down () {
    this.drop('user_change_logs')
  }
}

module.exports = UserChangeLogSchema
