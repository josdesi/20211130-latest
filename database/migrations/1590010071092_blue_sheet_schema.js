'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class BlueSheetSchema extends Schema {
  up () {
    this.table('blue_sheets', (table) => {
      // alter table
      table.string('time_to_start', 30).nullable().alter()
    })
  }

  down () {
    this.table('blue_sheets', (table) => {
      // reverse alternations
    })
  }
}

module.exports = BlueSheetSchema
