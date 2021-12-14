'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class SourceTypeSchema extends Schema {
  up () {
    this.create('source_types', (table) => {
      table.increments();
      table
        .string('title', 25)
        .notNullable()
        .unique();
      table.integer('created_by');
      table.integer('updated_by');
      table.timestamps();
    })
  }

  down () {
    this.drop('source_types')
  }
}

module.exports = SourceTypeSchema
