'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class CandidateSchema extends Schema {
  up () {
    this.table('candidates', (table) => {
      table.string('email', 64).nullable().alter()
    })
  }

  down () {
    this.table('candidates', (table) => {
      table.string('email', 64).notNullable().alter()
    })
  }
}

module.exports = CandidateSchema
