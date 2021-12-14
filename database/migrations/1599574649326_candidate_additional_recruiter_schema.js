'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class CandidateAdditionalRecruiterSchema extends Schema {
  up () {
    this.table('candidate_additional_recruiters', (table) => {
      // alter table
      table.text('decline_reason');
    })
  }

  down () {
    this.table('candidate_additional_recruiters', (table) => {
      // reverse alternations
      table.dropColumn('decline_reason');
    })
  }
}

module.exports = CandidateAdditionalRecruiterSchema
