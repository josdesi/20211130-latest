'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class PositionsSchema extends Schema {
  up () {
    this.table('positions', (table) => {
      // alter table
      table.dropColumn('subspecialty_id');
    })
  }

  down () {
    this.table('positions', (table) => {
      // reverse alternations
    })
  }
}

module.exports = PositionsSchema
