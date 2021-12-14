'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class CompanyRecruiterAssignmentSchema extends Schema {
  up () {
    this.create('company_recruiter_assignments', (table) => {
      table.increments()
      table.integer('company_id')
        .notNullable()
        .references('id')
        .inTable('companies');
      table.integer('recruiter_id')
        .notNullable()
        .references('id')
        .inTable('users');
      table.integer('coach_id')
        .notNullable()
        .references('id')
        .inTable('users');
      table.timestamps()
    })
  }

  down () {
    this.drop('company_recruiter_assignments')
  }
}

module.exports = CompanyRecruiterAssignmentSchema
