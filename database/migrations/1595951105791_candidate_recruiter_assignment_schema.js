'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database')

class CandidateRecruiterAssignmentSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      const insertHistoryAssignment = `
        INSERT INTO candidate_recruiter_assignments (candidate_id, recruiter_id,coach_id,created_at) 
        SELECT id,recruiter_id, created_by, CASE when id in (select cas.id from candidate_recruiter_assignments as cas where cas.id = id) then updated_at else created_at end as assignation_date
        FROM candidates where (recruiter_id,created_by) 
        in (select distinct recruiter_id,coach_id from recruiter_has_industries) and 
        (id,recruiter_id,created_by) not in 
        (select  cas.candidate_id,cas.recruiter_id,cas.coach_id  from candidate_recruiter_assignments as cas where cas.candidate_id = id and cas.recruiter_id = recruiter_id and cas.coach_id = created_by);
      `;
      await Database.raw(insertHistoryAssignment).transacting(transaction)
    })
  }
}

module.exports = CandidateRecruiterAssignmentSchema
