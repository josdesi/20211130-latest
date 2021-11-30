'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class CandidateBulkActivityReferenceSchema extends Schema {
  up() {
    this.create('candidate_bulk_activity_references', (table) => {
      table.increments();
      table
        .integer('candidate_activity_log_id')
        .unsigned()
        .references('id')
        .inTable('candidate_activity_logs')
        .notNullable()
        .index();
      table.integer('email_history_id').unsigned().references('id').inTable('email_histories').notNullable().index();
      table.timestamps();
    });
  }

  down() {
    this.drop('candidate_bulk_activity_references');
  }
}

module.exports = CandidateBulkActivityReferenceSchema;
