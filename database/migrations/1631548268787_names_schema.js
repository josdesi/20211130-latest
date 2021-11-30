'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class NamesSchema extends Schema {
  up () {
    this.table('names', (table) => {
      table.string('searchable_text', 1024);
      table.specificType('document_tokens', 'tsvector');
    })
  }

  down () {
    this.table('names', (table) => {
      table.dropColumn('searchable_text', 1024);
      table.dropColumn('document_tokens', 'ts_vector');
    })
  }
}

module.exports = NamesSchema
