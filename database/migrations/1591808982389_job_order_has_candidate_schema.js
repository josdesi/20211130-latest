'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class JobOrderHasCandidateSchema extends Schema {
  up () {
    this.create('job_order_has_candidates', (table) => {
      table.increments()
      table.integer('candidate_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('candidates');
      table.integer('job_order_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('job_orders');
      table.timestamps()
    })
    const addUnique = `
      ALTER TABLE job_order_has_candidates
      ADD CONSTRAINT unique_job_order_candidate
      UNIQUE (job_order_id, candidate_id)
    `
    this.raw(addUnique)

  }

  down () {
    this.drop('job_order_has_candidates')
  }
}

module.exports = JobOrderHasCandidateSchema
