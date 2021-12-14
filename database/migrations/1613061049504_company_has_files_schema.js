'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class CompanyHasFilesSchema extends Schema {
  up () {
    this.create('company_has_files', (table) => {
      table.increments()
      table.integer('company_id').references('id').inTable('companies');
      table.integer('file_type_id').references('id').inTable('file_types');
      table.string('url', 512);
      table.string('file_name');
      table.timestamps()
    })
  }

  down () {
    this.drop('company_has_files')
  }
}

module.exports = CompanyHasFilesSchema
