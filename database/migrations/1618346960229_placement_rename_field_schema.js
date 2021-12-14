'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class PlacementRenameFieldSchema extends Schema {
  up () {
    this.table('placements', (table) => {
      // alter table
      table.renameColumn('fee_percent', 'fee_percentage');
    })
  }

  down () {
    this.table('placements', (table) => {
      // reverse alternations
      table.renameColumn('fee_percentage', 'fee_percent');
    })
  }
}

module.exports = PlacementRenameFieldSchema
