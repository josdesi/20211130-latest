'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class AddNetSuiteRequiredFieldsToPlacementSchema extends Schema {
  up () {
    this.table('placements', (table) => {
      // alter table
      table.integer('sales_order_id');
      table.boolean('is_dirty').defaultTo(false);
    })
  }

  down () {
    this.table('placements', (table) => {
      // reverse alternations
      table.dropColumn('sales_order_id');
      table.dropColumn('is_dirty');
    })
  }
}

module.exports = AddNetSuiteRequiredFieldsToPlacementSchema
