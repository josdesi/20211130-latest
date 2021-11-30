'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class WhiteSheetsSchema extends Schema {
  up () {
    this.table('white_sheets', (table) => {
      table.boolean('company_prepared_to_sign_service_agreement');
      table.boolean('company_prepared_to_interview_asap');
    })
  }

  down () {
    this.table('white_sheets', (table) => {
      table.dropColumn('company_prepared_to_sign_service_agreement');
      table.dropColumn('company_prepared_to_interview_asap');
    })
  }
}

module.exports = WhiteSheetsSchema
