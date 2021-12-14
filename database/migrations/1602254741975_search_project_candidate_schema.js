'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class SearchProjectCandidateSchema extends Schema {
  up() {
    this.create('search_project_candidates', (table) => {
      table.increments();
      table.integer('candidate_id').unsigned().references('id').inTable('candidates').notNullable();
      table.integer('created_by').unsigned().references('id').inTable('users').notNullable();
      table.integer('search_project_id').unsigned().references('id').inTable('search_projects').notNullable();
      table.timestamps();
    });
  }

  down() {
    this.drop('search_project_candidates');
  }
}

module.exports = SearchProjectCandidateSchema;
