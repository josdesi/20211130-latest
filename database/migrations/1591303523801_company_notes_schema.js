'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class CompanyNotesSchema extends Schema {
  up () {
    this.table('company_notes', (table) => {
      table.string('title', 512).alter();
    })
  }

  down () {
    this.table('company_notes', (table) => {
      table.string('title', 60).alter();
    })
  }
}

module.exports = CompanyNotesSchema
