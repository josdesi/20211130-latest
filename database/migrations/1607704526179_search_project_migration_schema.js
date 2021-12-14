'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');
const Database = use('Database');

class SearchProjectMigrationSchema extends Schema {
  up () {
    this.table('search_project_migrations', (table) => {
      table.string('type');
    })
    this.schedule(async (transaction) => {
      await Database.raw(`UPDATE search_project_migrations set type = 'search-project'`).transacting(transaction);
    });
    this.renameTable('search_project_migrations', 'migrations');
  }

  down () {

  }
}

module.exports = SearchProjectMigrationSchema
