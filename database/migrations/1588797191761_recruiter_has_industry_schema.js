'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class RecruiterHasIndustrySchema extends Schema {
  up () {
    this.table('recruiter_has_industries', (table) => {
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
    this.table('recruiter_has_industries', (table) => {
      // reverse alternations
      table.dropColumn('specialty_id');
      table.dropColumn('subspecialty_id');
    })
  }
}

module.exports = RecruiterHasIndustrySchema
