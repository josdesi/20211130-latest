'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class WhiteSheetSchema extends Schema {
  up () {
    this.table('white_sheets', (table) => {
      // alter table
      table.text('benefits').alter()
    })
  }

  down () {
    this.table('white_sheets', (table) => {
      // reverse alternations
      table.string('benefits',254).alter()
    })
  }
}

module.exports = WhiteSheetSchema
