'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class NamesSchema extends Schema {
  up () {
    this.table('names', (table) => {
      table.dropColumn('name_type_id');
    })
  }

  down () {
    this.table('names', (table) => {
      table.integer('name_type_id')
        .references('id')
        .inTable('name_types');
    })
  }
}

module.exports = NamesSchema
