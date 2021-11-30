'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class JobOrderActivityLogSchema extends Schema {
  up() {
    this.table('job_order_activity_logs', (table) => {
      // alter table
      table.json('metadata');
    });
  }

  down() {
    this.table('job_order_activity_logs', (table) => {
      // reverse alternations
      table.dropColumn('metadata');
    });
  }
}

module.exports = JobOrderActivityLogSchema;
