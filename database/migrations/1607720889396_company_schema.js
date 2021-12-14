'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class CompanySchema extends Schema {
  up () {
    this.table('companies', (table) => {
      // alter table
      table.integer('company_type_id')
        .references('id')
        .inTable('company_types');
    })
  }

  down () {
    this.table('companies', (table) => {
      // reverse alternations
      table.dropColumn('company_type_id')
    })
  }
}

module.exports = CompanySchema
