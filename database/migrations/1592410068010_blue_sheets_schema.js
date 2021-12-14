'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class BlueSheetsSchema extends Schema {
  up () {
    this.table('blue_sheets', (table) => {
      table.integer('work_type_option_id')
        .unsigned()
        .references('id')
        .inTable('work_type_options')
    })
  }

  down () {
    this.table('blue_sheets', (table) => {
      table.dropColumn('work_type_option_id')
    })
  }
}

module.exports = BlueSheetsSchema
