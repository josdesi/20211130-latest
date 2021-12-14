'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class ActivityLogTypeSchema extends Schema {
  up () {
    this.table('activity_log_types', (table) => {
      // alter table
      table.string('title', 50).notNullable().alter();
    })
  }

  down () {
    this.table('activity_log_types', (table) => {
      // reverse alternations
      table.string('title', 25).notNullable().alter();
    })
  }
}

module.exports = ActivityLogTypeSchema
