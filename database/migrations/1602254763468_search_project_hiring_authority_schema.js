'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class SearchProjectHiringAuthoritySchema extends Schema {
  up() {
    this.create('search_project_hiring_authorities', (table) => {
      table.increments();
      table.integer('hiring_authority_id').unsigned().references('id').inTable('hiring_authorities').notNullable();
      table.integer('created_by').unsigned().references('id').inTable('users').notNullable();
      table.integer('search_project_id').unsigned().references('id').inTable('search_projects').notNullable();
      table.timestamps();
    });
  }

  down() {
    this.drop('search_project_hiring_authorities');
  }
}

module.exports = SearchProjectHiringAuthoritySchema;
