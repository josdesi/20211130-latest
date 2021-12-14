'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class CandidateRecruiterAssignmentsSchema extends Schema {
  up () {
    this.table('candidate_recruiter_assignments', (table) => {
      // alter table
      table.string('action').defaultTo('assign');
      table.string('type').defaultTo('main');
      table.integer('another_recruiter_id')
        .references('id')
        .inTable('users');
    })
  }

  down () {
    this.table('candidate_recruiter_assignments', (table) => {
      // reverse alternations
      table.dropColumn('action');
      table.dropColumn('type');
      table.dropColumn('another_recruiter_id');

    })
  }
}

module.exports = CandidateRecruiterAssignmentsSchema
