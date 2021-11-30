'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class BlueSheetHasRelocationSchema extends Schema {
  up () {
    this.create('blue_sheet_has_relocations', (table) => {
      table.increments();
      table
        .integer('blue_sheet_id')
        .unsigned()
        .references('id')
        .inTable('blue_sheets');
      table
        .integer('city_id')
        .unsigned()
        .references('id')
        .inTable('cities');
      table.timestamps();
    })
  }

  down () {
    this.drop('blue_sheet_has_relocations')
  }
}

module.exports = BlueSheetHasRelocationSchema
