'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');
const SearchProjectTypeSeeder = require('../Seeds/SearchProjectTypeSeeder');

class SearchProjectTypeSchema extends Schema {
  up() {
    this.schedule(async (transaction) => {
      try {
        await SearchProjectTypeSeeder.run(transaction);
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    });
  }

  down() {
    this.table('search_project_types', (table) => {
      // reverse alternations
    });
  }
}

module.exports = SearchProjectTypeSchema;
