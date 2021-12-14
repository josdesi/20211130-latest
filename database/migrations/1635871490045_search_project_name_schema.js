'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');
const Database = use('Database');

class SearchProjectNameSchema extends Schema {
  up() {
    this.schedule(async (transaction) => {
      const createItemIdIndex = 'CREATE INDEX on search_project_names (name_id);';
      const createSearchProjectIdIndex = 'CREATE INDEX on search_project_names (search_project_id);';

      await Database.raw(createItemIdIndex).transacting(transaction);
      await Database.raw(createSearchProjectIdIndex).transacting(transaction);
    });
  }

  down() {}
}

module.exports = SearchProjectNameSchema;
