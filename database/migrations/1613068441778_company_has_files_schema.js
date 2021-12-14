'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class CompanyHasFilesSchema extends Schema {
  up () {
    this.table('company_has_files', (table) => {
      table.integer('created_by').references('id').inTable('users').notNullable();
    })
  }

  down () {
    this.table('company_has_files', (table) => {
      table.dropColumn('created_by');
    })
  }
}

module.exports = CompanyHasFilesSchema
