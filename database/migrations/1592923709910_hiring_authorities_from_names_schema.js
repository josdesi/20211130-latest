'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class HiringAuthoritiesFromNamesSchema extends Schema {
  up () {
    this.create('hiring_authorities_from_names', (table) => {
      table.bigIncrements()
      table.integer('hiring_authority_id')
        .references('id')
        .inTable('hiring_authorities');
        
      table.integer('name_id')
        .references('id')
        .inTable('names');
      table.timestamps()
    })
  }

  down () {
    this.drop('hiring_authorities_from_names')
  }
}

module.exports = HiringAuthoritiesFromNamesSchema
