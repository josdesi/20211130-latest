'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class HiringAuthorityActivityLogsSchema extends Schema {
  up () {
    this.create('hiring_authority_activity_logs', (table) => {
      table.increments()
      table
        .integer('user_id')
        .unsigned()
        .references('id')
        .inTable('users');
      table
        .integer('hiring_authority_id')
        .unsigned()
        .references('id')
        .inTable('hiring_authorities');
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
    this.drop('hiring_authority_activity_logs')
  }
}

module.exports = HiringAuthorityActivityLogsSchema
