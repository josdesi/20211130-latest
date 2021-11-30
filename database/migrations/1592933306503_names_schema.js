'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class NamesSchema extends Schema {
  up () {
    this.table('names', (table) => {
      table.integer('original_name_id')
        .references('id')
        .inTable('names')
        .unique();
    })
  }

  down () {
    this.table('names', (table) => {
      table.dropColumn('original_name_id');
    })
  }
}

module.exports = NamesSchema
