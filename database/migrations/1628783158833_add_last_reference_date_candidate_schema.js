'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class AddLastReferenceDateCandidateSchema extends Schema {
  up () {
    this.table('candidates', (table) => {
      // alter table
      table.datetime('last_sent_reference_date');
    })
  }

  down () {
    this.table('candidates', (table) => {
      // reverse alternations
      table.dropColumn('last_sent_reference_date');
    })
  }
}

module.exports = AddLastReferenceDateCandidateSchema
