'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class MigrationLogsSchema extends Schema {
  up () {
    this.create('migration_logs', (table) => {
      table.increments()
      table.integer('migration_id')
      .unsigned()
      .references('id')
      .on('migrations');
      table.text('description');
      table.integer('progress');
      table.integer('migration_type_id')
      .unsigned()
      .references('id')
      .on('migration_types');
      table.timestamps()
    })
  }

  down () {
    this.drop('migration_logs')
  }
}

module.exports = MigrationLogsSchema
