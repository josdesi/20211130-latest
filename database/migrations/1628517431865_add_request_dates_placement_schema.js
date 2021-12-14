'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class AddRequestDatesPlacementSchema extends Schema {
  up () {
    this.table('placements', (table) => {
      // alter table
      table.datetime('fall_off_request_date');
      table.datetime('fall_off_revert_request_date');
    })
  }

  down () {
    this.table('placements', (table) => {
      // reverse alternations
      table.dropColumn('fall_off_request_date');
      table.dropColumn('fall_off_revert_request_date');
    })
  }
}

module.exports = AddRequestDatesPlacementSchema
