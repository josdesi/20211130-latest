'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class CandidateAdditionalRecruiterSchema extends Schema {
  up () {
    this.create('candidate_additional_recruiters', (table) => {
      table.increments()
      table.integer('candidate_id')
        .notNullable()
        .references('id')
        .inTable('candidates');
      table.integer('recruiter_id')
        .notNullable()
        .references('id')
        .inTable('users');
      table.string('status');
      table.string('type');
      table.text('notes');
      table.integer('recruiter_to_collaborate_id')
        .references('id')
        .inTable('users');
      table.integer('created_by')
        .notNullable()
        .references('id')
        .inTable('users');
      table.integer('updated_by')
        .notNullable()
        .references('id')
        .inTable('users');
      table.timestamps()
    })
  }

  down () {
    this.drop('candidate_additional_recruiters')
  }
}

module.exports = CandidateAdditionalRecruiterSchema
