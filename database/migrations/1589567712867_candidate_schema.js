'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class CandidateSchema extends Schema {
  up () {
    this.table('candidates', (table) => {
      // alter table
      table.boolean('pcr_record').defaultTo(false)
    })
  }

  down () {
    this.table('candidates', (table) => {
      // reverse alternations
      table.dropColumn('pcr_record')
    })
  }
}

module.exports = CandidateSchema
