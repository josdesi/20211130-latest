'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class WhiteSheetsSchema extends Schema {
  up () {
    this.table('white_sheets', (table) => {
      table.json('preset_interview_dates').nullable().alter()
    })
  }

  down () {
    this.table('white_sheets', (table) => {
      table.json('preset_interview_dates').nullable().alter()
    })
  }
}

module.exports = WhiteSheetsSchema
