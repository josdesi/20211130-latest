'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class WhiteSheetSchema extends Schema {
  up () {
    this.table('white_sheets', (table) => {
      table.date('position_filled').nullable().alter()
    })
  }

  down () {
    this.table('white_sheets', (table) => {
      table.date('string', 50).notNullable().alter()
    })
  }
}

module.exports = WhiteSheetSchema
