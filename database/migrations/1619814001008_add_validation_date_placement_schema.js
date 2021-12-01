'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class AddValidationDatePlacementSchema extends Schema {
  up () {
    this.table('placements', (table) => {
      // alter table
      table.datetime('approved_date');
    })
  }

  down () {
    this.table('placements', (table) => {
      // reverse alternations
      table.dropColumn('approved_date');
    })
  }
}

module.exports = AddValidationDatePlacementSchema
