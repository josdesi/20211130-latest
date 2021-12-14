'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class SearchProjectMigrationSchema extends Schema {
  up () {
    this.create('search_project_migrations', (table) => {
      table.increments()
      table.text('url').notNullable();
      table.string('file_name',254);
      table.string('original_name',254);
      table.jsonb('config');
      table
        .integer('created_by')
        .unsigned()
        .references('id')
        .on('users')
      table.timestamps()
    })
  }

  down () {
    this.drop('search_project_migrations')
  }
}

module.exports = SearchProjectMigrationSchema
