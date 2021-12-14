'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class SearchProjectChangeLogSchema extends Schema {
  up() {
    this.create('search_project_change_logs', (table) => {
      table.increments();
      table.integer('search_project_id').unsigned().notNullable().references('id').inTable('search_projects');
      table.integer('created_by').references('id').inTable('users');
      table.string('entity', 16).notNullable();
      table.string('operation', 16).notNullable();
      table.jsonb('payload');
      table.timestamps();
    });
  }

  down() {
    this.drop('search_project_change_logs');
  }
}

module.exports = SearchProjectChangeLogSchema;
