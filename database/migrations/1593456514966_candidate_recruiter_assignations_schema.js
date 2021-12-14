'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class CandidateRecruiterAssignationsSchema extends Schema {
  up () {
    this.create('candidate_recruiter_assignations', (table) => {
      table.increments()
      table.integer('candidate_id')
        .notNullable()
        .references('id')
        .inTable('candidates');
      table.integer('recruiter_id')
        .notNullable()
        .references('id')
        .inTable('users');
      table.timestamps()
    })
  }

  down () {
    this.drop('candidate_recruiter_assignations')
  }
}

module.exports = CandidateRecruiterAssignationsSchema
