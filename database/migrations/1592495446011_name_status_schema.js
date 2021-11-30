'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class NameStatusSchema extends Schema {
  up () {
    this.create('name_statuses', (table) => {
      table.increments()
      table
        .integer('name_type_id')
        .unsigned()
        .references('id')
        .inTable('name_types');
      table
        .string('title', 25)
        .notNullable();
      table.timestamps()
    })
  }

  down () {
    this.drop('name_statuses')
  }
}

module.exports = NameStatusSchema
