'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class CompanySchema extends Schema {
  up () {
    this.table('companies', (table) => {
      // alter table
      table.boolean('pcr_record').defaultTo(false)
      table.string('email',64).nullable().alter()
    })
  }

  down () {
    this.table('companies', (table) => {
      // reverse alternations
      table.dropColumn('pcr_record')
      table.string('email',64).notNullable().alter()
    })
  }
}

module.exports = CompanySchema
