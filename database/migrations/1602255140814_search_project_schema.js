'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class SearchProjectSchema extends Schema {
  up() {
    this.table('search_projects', (table) => {
      // alter table
      table.integer('created_by').unsigned().references('id').inTable('users').notNullable();
      table.boolean('pcr_record').defaultTo(false);
    });
  }

  down() {
    this.table('search_projects', (table) => {
      // reverse alternations
      this.drop('created_by');
      this.drop('pcr_record');
    });
  }
}

module.exports = SearchProjectSchema;
