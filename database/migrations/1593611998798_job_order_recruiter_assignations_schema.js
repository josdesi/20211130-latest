'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class JobOrderRecruiterAssignationsSchema extends Schema {
  up () {
    this.rename('job_order_recruiter_assignations', 'job_order_recruiter_assignments');
  }

  down () {
    this.rename('job_order_recruiter_assignments', 'job_order_recruiter_assignations');
  }
}

module.exports = JobOrderRecruiterAssignationsSchema
