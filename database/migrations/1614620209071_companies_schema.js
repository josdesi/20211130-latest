'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class CompaniesSchema extends Schema {
  up () {
    this.table('companies', (table) => {
      table
        .integer('city_id')
        .unsigned()
        .references('id')
        .inTable('cities');
      table.string('address', 250);
      table.string('zip', 8);
      table.specificType('coordinates', 'POINT');
    })
  }

  down () {
    this.table('companies', (table) => {
      table.dropColumn('city_id');
      table.dropColumn('address');
      table.dropColumn('zip');
      table.dropColumn('coordinates');                  
    })
  }
}

module.exports = CompaniesSchema
