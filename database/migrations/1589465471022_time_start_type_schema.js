'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class TimeStartTypeSchema extends Schema {
  up () {
    this.create('time_start_types', (table) => {
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
    this.drop('time_start_types')
  }
}

module.exports = TimeStartTypeSchema
