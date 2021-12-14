'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class CandidateNoteSchema extends Schema {
  up () {
    this.table('candidate_notes', (table) => {
      // alter table
      table.string('title',60)
    })
  }

  down () {
    this.table('candidate_notes', (table) => {
      // reverse alternations
    })
  }
}

module.exports = CandidateNoteSchema
