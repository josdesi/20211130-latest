'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');
const Database = use('Database');

class SearchProjectCandidateSchema extends Schema {
  up() {
    this.schedule(async (transaction) => {
      const createItemIdIndex = 'CREATE INDEX on search_project_candidates (candidate_id);';
      const createSearchProjectIdIndex = 'CREATE INDEX on search_project_candidates (search_project_id);';

      await Database.raw(createItemIdIndex).transacting(transaction);
      await Database.raw(createSearchProjectIdIndex).transacting(transaction);
    });
  }

  down() {}
}

module.exports = SearchProjectCandidateSchema;
