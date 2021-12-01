'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class CandidatesFromNamesSchema extends Schema {
  up () {
    this.create('candidates_from_names', (table) => {
      table.bigIncrements()
      table.integer('candidate_id')
        .references('id')
        .inTable('candidates');
        
      table.integer('name_id')
        .references('id')
        .inTable('names');
      table.timestamps()
    })
  }

  down () {
    this.drop('candidates_from_names')
  }
}

module.exports = CandidatesFromNamesSchema
