'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class HiringAuthorityNotesSchema extends Schema {
  up () {
    this.table('hiring_authority_notes', (table) => {
      table.string('title', 255).notNullable()
    })
  }

  down () {
    this.table('hiring_authority_notes', (table) => {
      table.dropColumn('title')
    })
  }
}

module.exports = HiringAuthorityNotesSchema
