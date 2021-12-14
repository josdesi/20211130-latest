'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class CandidateActivityLogSchema extends Schema {
  up() {
    this.table('candidate_activity_logs', (table) => {
      // alter table
      table.json('metadata');
    });
  }

  down() {
    this.table('candidate_activity_logs', (table) => {
      // reverse alternations
      table.dropColumn('metadata');
    });
  }
}

module.exports = CandidateActivityLogSchema;
