'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class CandidateStatusSchema extends Schema {
  up () {
    this.table('candidate_statuses', (table) => {
      table.boolean('selectable').defaultTo(false);
    })
  }

  down () {
    this.table('candidate_statuses', (table) => {
      table.dropColumn('selectable');
    })
  }
}

module.exports = CandidateStatusSchema
