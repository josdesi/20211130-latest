'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class CandidateActivityLogSchema extends Schema {
  up() {
    this.table('candidate_activity_logs', (table) => {
      // alter table
      table.boolean('created_by_system').defaultTo(false);
    });
  }

  down() {
    this.table('candidate_activity_logs', (table) => {
      // reverse alternations
      table.dropColumn('created_by_system');
    });
  }
}

module.exports = CandidateActivityLogSchema;
