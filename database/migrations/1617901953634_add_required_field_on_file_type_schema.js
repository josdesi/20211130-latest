'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class AddRequiredFieldOnFileTypeSchema extends Schema {
  up () {
    this.table('file_types', (table) => {
      // alter table
      table.boolean('required').defaultTo(false);
    })
  }

  down () {
    this.table('file_types', (table) => {
      // reverse alternations
      table.dropColumn('required');
    })
  }
}

module.exports = AddRequiredFieldOnFileTypeSchema
