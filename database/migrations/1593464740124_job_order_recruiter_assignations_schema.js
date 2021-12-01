'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class HiringAuthorityRecruiterAssignationsSchema extends Schema {
  up () {
    this.table('job_order_recruiter_assignations', (table) => {
      table.integer('coach_id')
      .notNullable()
      .references('id')
      .inTable('users');
    })
  }

  down () {
    this.table('job_order_recruiter_assignations', (table) => {
      table.dropColum('coach_id');
    })
  }
}

module.exports = HiringAuthorityRecruiterAssignationsSchema
