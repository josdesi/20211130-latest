'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class SearchProjectSchema extends Schema {
  up() {
    this.create('search_projects', (table) => {
      table.increments();
      table.string('name', 512).notNullable();
      table.boolean('is_private').defaultTo(true);
      table.timestamps();
    });
  }

  down() {
    this.drop('search_projects');
  }
}

module.exports = SearchProjectSchema;
