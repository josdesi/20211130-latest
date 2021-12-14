'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class JobOrderOperatingMetricsSchema extends Schema {
  up() {
    this.create('job_order_operating_metrics', (table) => {
      table.increments();
      table.integer('job_order_id').unsigned().references('id').on('job_orders');
      table.timestamp('start_date');
      table.timestamp('end_date');
      table.jsonb('checklist');
      table.timestamps();
    });
  }

  down() {
    this.drop('job_order_operating_metrics');
  }
}

module.exports = JobOrderOperatingMetricsSchema;
