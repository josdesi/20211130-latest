'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');
const Database = use('Database');

class SearchProjectHiringAuthoritySchema extends Schema {
  up() {
    this.schedule(async (transaction) => {
      const createItemIdIndex = 'CREATE INDEX on search_project_hiring_authorities (hiring_authority_id);';
      const createSearchProjectIdIndex = 'CREATE INDEX on search_project_hiring_authorities (search_project_id);';

      await Database.raw(createItemIdIndex).transacting(transaction);
      await Database.raw(createSearchProjectIdIndex).transacting(transaction);
    });
  }

  down() {}
}

module.exports = SearchProjectHiringAuthoritySchema;
