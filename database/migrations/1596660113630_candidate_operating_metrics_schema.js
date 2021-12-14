'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class CandidateOperatingMetricsSchema extends Schema {
  up() {
    this.create('candidate_operating_metrics', (table) => {
      table.increments();
      table.integer('candidate_id').unsigned().references('id').on('candidates');
      table.timestamp('start_date');
      table.timestamp('end_date');
      table.jsonb('checklist');
      table.timestamps();
    });
  }

  down() {
    this.drop('candidate_operating_metrics');
  }
}

module.exports = CandidateOperatingMetricsSchema;
