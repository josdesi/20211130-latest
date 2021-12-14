'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class SearchProjectNameSchema extends Schema {
  up() {
    this.create('search_project_names', (table) => {
      table.increments();
      table.integer('name_id').unsigned().references('id').inTable('names').notNullable();
      table.integer('created_by').unsigned().references('id').inTable('users').notNullable();
      table.integer('search_project_id').unsigned().references('id').inTable('search_projects').notNullable();
      table.timestamps();
    });
  }

  down() {
    this.drop('search_project_names');
  }
}

module.exports = SearchProjectNameSchema;
