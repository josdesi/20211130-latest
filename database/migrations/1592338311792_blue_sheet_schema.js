'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class BlueSheetSchema extends Schema {
  up () {
    this.table('blue_sheets', (table) => {
      // alter table
      table.float('minimum_salary').alter();
      table.float('good_salary').alter();
      table.float('no_brainer_salary').alter();
    })
  }

  down () {
    this.table('blue_sheets', (table) => {
      // reverse alternations
    })
  }
}

module.exports = BlueSheetSchema
