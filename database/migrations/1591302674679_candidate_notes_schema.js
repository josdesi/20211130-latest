'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class CandidateNotesSchema extends Schema {
  up () {
    this.table('candidate_notes', (table) => {
      table.string('title', 512).alter();
    })
  }

  down () {
    this.table('candidate_notes', (table) => {
      table.string('title', 60).alter();
    })
  }
}

module.exports = CandidateNotesSchema
