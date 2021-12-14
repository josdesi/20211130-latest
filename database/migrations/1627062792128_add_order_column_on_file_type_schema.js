'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class AddOrderColumnOnFileTypeSchema extends Schema {
  up () {
    this.table('file_types', (table) => {
      // alter table
      table.integer('order');
      table.boolean('multiple').defaultTo(false);
    })
  }

  down () {
    this.table('file_types', (table) => {
      // reverse alternations
      table.dropColumn('order');
      table.dropColumn('multiple');
    })
  }
}

module.exports = AddOrderColumnOnFileTypeSchema
