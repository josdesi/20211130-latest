'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class NameActivityLogSchema extends Schema {
  up () {
    this.create('name_activity_logs', (table) => {
      table.increments()
      table
        .integer('user_id')
        .unsigned()
        .references('id')
        .inTable('users');
      table
        .integer('name_id')
        .unsigned()
        .references('id')
        .inTable('names');
      table
        .integer('activity_log_type_id')
        .unsigned()
        .references('id')
        .inTable('activity_log_types');
      table.text('body')
      table.timestamps()
    })
  }

  down () {
    this.drop('name_activity_logs')
  }
}

module.exports = NameActivityLogSchema
