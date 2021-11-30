'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class RecruiterOperatingMetricsSchema extends Schema {
  up() {
    this.create('recruiter_operating_metrics', (table) => {
      table.increments();
      table.integer('recruiter_id').unsigned().references('id').on('users');
      table.timestamp('start_date');
      table.timestamp('end_date');
      table.jsonb('checklist');
      table.timestamps();
    });
  }

  down() {
    this.drop('recruiter_operating_metrics');
  }
}

module.exports = RecruiterOperatingMetricsSchema;
