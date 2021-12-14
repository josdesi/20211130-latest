'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class FileTypeSchema extends Schema {
  up () {
    this.table('file_types', (table) => {
      // alter table
      table.string('module').defaultTo('inventory');
    })
  }

  down () {
    this.table('file_types', (table) => {
      // reverse alternations
      table.dropColumn('module');
    })
  }
}

module.exports = FileTypeSchema
