'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class CandidatesSchema extends Schema {
  up () {
    this.table('candidates', (table) => {
      // alter table
      table.boolean('free_game').defaultTo(false)
    })
  }

  down () {
    this.table('candidates', (table) => {
      // reverse alternations
      table.dropColumn('free_game')
    })
  }
}

module.exports = CandidatesSchema
