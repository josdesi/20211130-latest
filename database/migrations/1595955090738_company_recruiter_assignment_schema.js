'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database')

class CompanyRecruiterAssignmentSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      const insertHistoryAssignment = `
        INSERT INTO company_recruiter_assignments (company_id, recruiter_id,coach_id,created_at) 
        SELECT id,recruiter_id, created_by, CASE when id in (select cp.id from company_recruiter_assignments as cp where cp.id = id) then updated_at else created_at end as assignation_date
        FROM companies where (recruiter_id,created_by) 
        in (select distinct recruiter_id,coach_id from recruiter_has_industries) and 
        (id,recruiter_id,created_by) not in 
        (select  cp.company_id,cp.recruiter_id,cp.coach_id  from company_recruiter_assignments as cp where cp.company_id = id and cp.recruiter_id = recruiter_id and cp.coach_id = created_by);
      `;
      await Database.raw(insertHistoryAssignment).transacting(transaction)
    })
  }
}

module.exports = CompanyRecruiterAssignmentSchema
