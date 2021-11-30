'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class CompaniesSchema extends Schema {
  up () {
    this.table('companies', (table) => {
      table.string('searchable_text', 1024);
    })
  }

  down () {
    this.table('companies', (table) => {
      table.dropColumn('searchable_text');
    })
  }
}

module.exports = CompaniesSchema
