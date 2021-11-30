'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class CandidateRecruiterAssignationsSchema extends Schema {
  up () {
    this.rename('candidate_recruiter_assignations', 'candidate_recruiter_assignments');
  }

  down () {
    this.rename('candidate_recruiter_assignments', 'candidate_recruiter_assignations');
  }
}

module.exports = CandidateRecruiterAssignationsSchema
