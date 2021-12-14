'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class CompaniesSchema extends Schema {
  up () {
    this.table('companies', (table) => {
      table.specificType('coordinates_as_geography', 'GEOGRAPHY(POINT,4326)');
    })
  }

  down () {
    this.table('companies', (table) => {
      table.dropColumn('coordinates_as_geography');
    })
  }
}

module.exports = CompaniesSchema
