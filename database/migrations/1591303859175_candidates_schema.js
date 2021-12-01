'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class CandidatesSchema extends Schema {
  up () {
    this.table('candidates', (table) => {
      table.string('title', 512).notNullable().alter();
      table.string('current_company', 512).alter();
    })
  }

  down () {
    this.table('candidates', (table) => {
      table.string('title', 254).notNullable().alter();
      table.string('current_company', 254).alter();
    })
  }
}

module.exports = CandidatesSchema
