'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class CitySchema extends Schema {
  up () {
    this.table('cities', (table) => {
      table.specificType('is_state', 'smallint').notNullable().defaultTo(0);
    })
  }

  down () {
    this.table('cities', (table) => {
      table.dropColumn('is_state')
    })
  }
}

module.exports = CitySchema
