'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class JobOrderActivityLogSchema extends Schema {
  up() {
    this.create('job_order_activity_logs', table => {
      table.increments();
      table
        .integer('user_id')
        .unsigned()
        .references('id')
        .inTable('users');
      table
        .integer('job_order_id')
        .unsigned()
        .references('id')
        .inTable('job_orders');
      table
        .integer('activity_log_type_id')
        .unsigned()
        .references('id')
        .inTable('activity_log_types');
      table.text('body');
      table.timestamps();
    });
  }

  down() {
    this.drop('job_order_activity_logs');
  }
}

module.exports = JobOrderActivityLogSchema;
