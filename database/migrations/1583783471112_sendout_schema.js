'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class SendoutSchema extends Schema {
  up() {
    this.create('sendouts', table => {
      table.increments();
      table
        .integer('job_order_id')
        .unsigned()
        .references('id')
        .inTable('job_orders');

      table
        .integer('candidate_id')
        .unsigned()
        .references('id')
        .inTable('candidates');

      table
        .integer('recruiter_id')
        .unsigned()
        .references('id')
        .inTable('users');
      

      table
        .integer('status_id')
        .unsigned()
        .references('id')
        .inTable('sendout_statuses');
      table.integer('compensation')
      table.datetime('sendout_date').notNullable();
      table.text('notes',4000)
      table.integer('percent')
      table.text('decline_reason',4000)
      table.timestamps();
      table.integer('created_by');
      table.integer('updated_by');
    });
  }

  down() {
    this.drop('sendouts');
  }
}

module.exports = SendoutSchema;
