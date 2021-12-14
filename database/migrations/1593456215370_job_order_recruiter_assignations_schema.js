'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class JobOrderRecruiterAssignationsSchema extends Schema {
  up () {
    this.create('job_order_recruiter_assignations', (table) => {
      table.increments()
      table.integer('job_order_id')
        .notNullable()
        .references('id')
        .inTable('job_orders');
      table.integer('recruiter_id')
        .notNullable()
        .references('id')
        .inTable('users');
      table.timestamps()
    })
  }

  down () {
    this.drop('job_order_recruiter_assignations')
  }
}

module.exports = JobOrderRecruiterAssignationsSchema
