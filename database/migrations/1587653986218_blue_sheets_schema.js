'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class BlueSheetsSchema extends Schema {
  up () {
    this.table('blue_sheets', (table) => {
      table.json('interview_dates').alter()
    })
  }

  down () {
    this.table('blue_sheets', (table) => {
      table.text('interview_dates').alter()
    })
  }
}

module.exports = BlueSheetsSchema
