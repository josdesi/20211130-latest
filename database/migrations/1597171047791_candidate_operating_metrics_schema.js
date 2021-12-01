'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class CandidateOperatingMetricsSchema extends Schema {
  up () {
    this.table('candidate_operating_metrics', (table) => {
      // alter table
      table.integer('created_by')
        .references('id')
        .inTable('users');
      table.integer('updated_by')
        .references('id')
        .inTable('users');
    })
  }

  down () {
    this.table('candidate_operating_metrics', (table) => {
      // reverse alternations
      table.dropColumn('created_by');
      table.dropColumn('updated_by');
    })
  }
}

module.exports = CandidateOperatingMetricsSchema
