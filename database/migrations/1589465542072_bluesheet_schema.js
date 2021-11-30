'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class BluesheetSchema extends Schema {
  up () {
    this.table('blue_sheets', (table) => {
      // alter table
      table
        .integer('time_start_type_id')
        .unsigned()
        .references('id')
        .inTable('time_start_types');
    })
  }

  down () {
    this.table('blue_sheets', (table) => {
      // reverse alternations
      table.dropColumn('time_start_type_id')
    })
  }
}

module.exports = BluesheetSchema
