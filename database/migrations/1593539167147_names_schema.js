'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class NamesSchema extends Schema {
  up () {
    this.table('names', (table) => {
      table.date('convertion_date');
    })
  }

  down () {
    this.table('names', (table) => {
      table.dropColumn('convertion_date');
    })
  }
}

module.exports = NamesSchema
