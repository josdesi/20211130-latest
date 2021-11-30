'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class WhitesheetSchema extends Schema {
  up () {
    this.table('white_sheets', (table) => {
      table.date('time_position_open').nullable().alter()
    })
  }

  down () {
    this.table('whitesheets', (table) => {
      table.string('time_position_open', 80).nullable().alter()
    })
  }
}

module.exports = WhitesheetSchema
