'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class CandidateRecruiterAssignationsSchema extends Schema {
  up () {
    this.table('candidate_recruiter_assignations', (table) => {
      table.integer('coach_id')
        .notNullable()
        .references('id')
        .inTable('users');
    })
  }

  down () {
    this.table('candidate_recruiter_assignations', (table) => {
      table.dropColum('coach_id');
    })
  }
}

module.exports = CandidateRecruiterAssignationsSchema
