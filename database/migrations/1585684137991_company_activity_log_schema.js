'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class CompanyActivityLogSchema extends Schema {
  up () {
    this.create('company_activity_logs', (table) => {
      table.increments()
      table
        .integer('user_id')
        .unsigned()
        .references('id')
        .inTable('users');
      table
        .integer('company_id')
        .unsigned()
        .references('id')
        .inTable('companies');
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
    this.drop('company_activity_logs')
  }
}

module.exports = CompanyActivityLogSchema
