'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const { candidateType } = use('App/Helpers/Globals');

class BlueSheetSchema extends Schema {
  up () {
    this.table('blue_sheets', (table) => {
      // alter table
      table
        .integer('candidate_type_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('candidate_types')
        .defaultTo(candidateType.CANT_TELL);
    })
  }

  down () {
    this.table('blue_sheets', (table) => {
      // reverse alternations
      table.dropColumn('candidate_type_id')
    })
  }
}

module.exports = BlueSheetSchema
