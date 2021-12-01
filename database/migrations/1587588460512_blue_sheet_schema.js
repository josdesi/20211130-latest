'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class BlueSheetSchema extends Schema {
  up () {
    this.table('blue_sheets', (table) => {
      table.text('notes').nullable()
    })
  }

  down () {
    this.table('blue_sheets', (table) => {
      table.dropColumn('notes')
    })
  }
}

module.exports = BlueSheetSchema
