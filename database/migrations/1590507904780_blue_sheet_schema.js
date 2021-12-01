'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class BlueSheetSchema extends Schema {
  up () {
    this
    .raw(`UPDATE blue_sheets set time_looking = created_at`)
    .table('blue_sheets', (table) => {
      table.date('time_looking').notNullable().alter();
    })
  }

  down () {
    this.table('blue_sheets', (table) => {
      table.string('time_looking', 30).notNullable().alter();
    })
  }
}

module.exports = BlueSheetSchema
