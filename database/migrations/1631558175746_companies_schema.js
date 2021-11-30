'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class CompaniesSchema extends Schema {
  up () {
    this.table('companies', (table) => {
      table.renameColumn('searchable_text', 'document_tokens');
    })
  }

  down () {
    this.table('companies', (table) => {
      table.dropColumn('document_tokens');
    })
  }
}

module.exports = CompaniesSchema
