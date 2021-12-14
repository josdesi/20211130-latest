'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class CompaniesSchema extends Schema {
  up () {
    this.table('companies', (table) => {
      table.specificType('signed', 'smallint');
    })
  }

  down () {
    this.table('companies', (table) => {
      table.dropColumn('signed');
    })
  }
}

module.exports = CompaniesSchema
