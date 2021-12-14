'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class WhiteSheetsSchema extends Schema {
  up () {
    this.table('white_sheets', (table) => {
      table.integer('warranty_time_in_days').nullable().alter();
    })
  }

  down () {
    this.table('white_sheets', (table) => {
      table.integer('warranty_time_in_days').notNullable().alter();
    })
  }
}

module.exports = WhiteSheetsSchema
