'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class CompanyNoteSchema extends Schema {
  up () {
    this.table('company_notes', (table) => {
      // alter table
      table.string('title',60)
    })
  }

  down () {
    this.table('company_notes', (table) => {
      // reverse alternations
    })
  }
}

module.exports = CompanyNoteSchema
