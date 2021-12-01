'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class CandidateTypeLogsSchema extends Schema {
  up() {
    this.create('candidate_type_logs', (table) => {
      // alter table
      table.increments();
      table.integer('candidate_id').unsigned().notNullable().references('id').inTable('candidates');
      table.integer('candidate_type_id').unsigned().notNullable().references('id').inTable('candidate_types');
      table.integer('created_by').references('id').inTable('users');

      table.timestamps();
    });
  }

  down() {
    this.drop('candidate_type_logs');
  }
}

module.exports = CandidateTypeLogsSchema;
