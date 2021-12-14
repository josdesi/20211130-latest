'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class CandidateHasFilesSchema extends Schema {
  up () {
    this.table('candidate_has_files', (table) => {
      table.integer('size').unsigned();
    })
  }

  down () {
    this.table('candidate_has_files', (table) => {
      table.dropColumn('size');
    })
  }
}

module.exports = CandidateHasFilesSchema
