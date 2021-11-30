'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class CandidateNoteSchema extends Schema {
  up () {
    this.create('candidate_notes', (table) => {
      table.increments()
      table
        .integer('user_id')
        .unsigned()
        .references('id')
        .inTable('users');
      table
        .integer('candidate_id')
        .unsigned()
        .references('id')
        .inTable('candidates');
      table.text('body')
      table.timestamps()
    })
  }

  down () {
    this.drop('candidate_notes')
  }
}

module.exports = CandidateNoteSchema
