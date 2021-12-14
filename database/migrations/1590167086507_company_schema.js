'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class CompanySchema extends Schema {
  up () {
    this.table('companies', (table) => {
      // alter table
      table.boolean('pcr_record_changed').defaultTo(false)
    })
  }

  down () {
    this.table('companies', (table) => {
      // reverse alternations
      table.dropColumn('pcr_record_changed')
    })
  }
}

module.exports = CompanySchema
