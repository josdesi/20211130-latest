'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class CompanyTypesSchema extends Schema {
  up () {
    this.table('company_types', (table) => {
      table.string('color');
    })
  }

  down () {
    this.table('company_types', (table) => {
      table.dropColumn('color');
    })
  }
}

module.exports = CompanyTypesSchema
