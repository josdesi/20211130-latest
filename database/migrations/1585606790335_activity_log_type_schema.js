'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class ActivityLogTypeSchema extends Schema {
  up () {
    this.create('activity_log_types', (table) => {
      table.increments()
      table
        .string('title', 25)
        .notNullable()
        .unique();
      table.integer('created_by');
      table.integer('updated_by');
      table.timestamps()
    })
  }

  down () {
    this.drop('activity_log_types')
  }
}

module.exports = ActivityLogTypeSchema
