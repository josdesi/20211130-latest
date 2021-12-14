'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class JobOrderBulkActivityReferenceSchema extends Schema {
  up() {
    this.create('job_order_bulk_activity_references', (table) => {
      table.increments();
      table
        .integer('job_order_activity_log_id')
        .unsigned()
        .references('id')
        .inTable('job_order_activity_logs')
        .notNullable()
        .index();
      table.integer('email_history_id').unsigned().references('id').inTable('email_histories').notNullable().index();
      table.timestamps();
    });
  }

  down() {
    this.drop('job_order_bulk_activity_references');
  }
}

module.exports = JobOrderBulkActivityReferenceSchema;
