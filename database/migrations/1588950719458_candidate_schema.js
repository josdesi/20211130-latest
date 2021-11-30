'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class CandidateSchema extends Schema {
  up () {
    this.table('candidates', (table) => {
      // alter table
      table
        .integer('specialty_id')
        .unsigned()
        .references('id')
        .inTable('specialties');
      table
        .integer('subspecialty_id')
        .unsigned()
        .references('id')
        .inTable('subspecialties');
    })
  }

  down () {
    this.table('candidates', (table) => {
      // reverse alternations
      table.dropColumn('specialty_id');
      table.dropColumn('subspecialty_id');
    })
  }
}

module.exports = CandidateSchema
