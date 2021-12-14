'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class WhiteSheetsSchema extends Schema {
  up () {
    this.table('white_sheets', (table) => {
      table.text('notes').nullable()
      table.integer('job_order_type_id').nullable().alter()
      table.specificType('relocation_assistance', 'smallint').nullable().alter()
      table.json('preset_interview_dates').alter().nullable()
    })
  }

  down () {
    this.table('white_sheets', (table) => {
      table.dropColumn('notes')
      table.integer('job_order_type_id').notNullable().alter()
      table.specificType('relocation_assistance', 'smallint').notNullable().alter()
      table.text('preset_interview_dates').alter()
    })
  }
}

module.exports = WhiteSheetsSchema
