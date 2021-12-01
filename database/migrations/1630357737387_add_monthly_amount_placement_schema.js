'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class AddMonthlyAmountPlacementSchema extends Schema {
  up () {
    this.table('placements', (table) => {
      // alter table
      table.float('monthly_amount');
    })
  }

  down () {
    this.table('placements', (table) => {
      // reverse alternations
      table.dropColumn('monthly_amount');
    })
  }
}

module.exports = AddMonthlyAmountPlacementSchema
