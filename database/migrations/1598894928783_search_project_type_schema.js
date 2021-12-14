'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');
const Database = use('Database');

class SearchProjectTypeSchema extends Schema {
  up() {
    this.create('search_project_types', (table) => {
      table.increments();
      table.string('title', 50).notNullable();
      table.timestamps();
    });

    this.schedule(async (transaction) => {
      await Database.table('search_project_types')
        .transacting(transaction)
        .insert([
          { title: 'Candidate' },
          { title: 'Hiring Authority' }
        ]);
    });
  }

  down() {
    this.drop('search_project_types');
  }
}

module.exports = SearchProjectTypeSchema;
