'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class RecruiterHasIndustrySchema extends Schema {
  up () {
    this.table('recruiter_has_industries', (table) => {
      // alter table
      table
        .integer('regional_director_id')
        .unsigned()
        .references('id')
        .on('users')
    })
  }

  down () {
    this.table('recruiter_has_industries', (table) => {
      // reverse alternations
      table.dropColumn('regional_director_id')
    })
  }
}

module.exports = RecruiterHasIndustrySchema
