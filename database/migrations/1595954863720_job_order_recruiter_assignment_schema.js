'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database')

class JobOrderRecruiterAssignmentSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      const insertHistoryAssignment = `
        INSERT INTO job_order_recruiter_assignments (job_order_id, recruiter_id,coach_id,created_at) 
        SELECT id,recruiter_id, created_by, CASE when id in (select jos.id from job_order_recruiter_assignments as jos where jos.id = id) then updated_at else created_at end as assignation_date
        FROM job_orders where (recruiter_id,created_by) 
        in (select distinct recruiter_id,coach_id from recruiter_has_industries) and 
        (id,recruiter_id,created_by) not in 
        (select  jos.job_order_id,jos.recruiter_id,jos.coach_id  from job_order_recruiter_assignments as jos where jos.job_order_id = id and jos.recruiter_id = recruiter_id and jos.coach_id = created_by);
      `;
      await Database.raw(insertHistoryAssignment).transacting(transaction)
    })
  }
}

module.exports = JobOrderRecruiterAssignmentSchema
