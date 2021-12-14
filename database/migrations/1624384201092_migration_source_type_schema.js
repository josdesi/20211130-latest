'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class MigrationSourceTypeSchema extends Schema {
  up () {
    this.create('migration_source_types', (table) => {
      table.increments();
      table
        .string('title', 25)
        .notNullable()
        .unique();
      table.timestamps();
    })
  }

  down () {
    this.drop('migration_source_types')
  }
}

module.exports = MigrationSourceTypeSchema
