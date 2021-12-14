'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class NameSchema extends Schema {
  up () {
    this.table('names', (table) => {
      // alter table
      table.integer('company_id')
        .references('id')
        .inTable('companies');
    })
  }

  down () {
    this.table('names', (table) => {
      // reverse alternations
      table.dropColumn('company_id')
    })
  }
}

module.exports = NameSchema
