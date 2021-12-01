'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class PlacementSchema extends Schema {
  up () {
    this.table('placements', (table) => {
      // alter table
      table.datetime('last_invoice_date');
    })
  }

  down () {
    this.table('placements', (table) => {
      // reverse alternations
      table.dropColumn('last_invoice_date');
    })
  }
}

module.exports = PlacementSchema
