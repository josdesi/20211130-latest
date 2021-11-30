'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class CandidateSchema extends Schema {
  up () {
    this.table('candidates', (table) => {
      // alter table
      table.string('link_profile', 1024).alter();
    })
  }

  down () {
    this.table('candidates', (table) => {
      // reverse alternations
      table.string('link_profile', 254).alter();
    })
  }
}

module.exports = CandidateSchema
