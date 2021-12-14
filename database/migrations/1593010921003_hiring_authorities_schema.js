'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class HiringAuthoritiesSchema extends Schema {
  up () {
    this.table('hiring_authorities', (table) => {
      table.integer('hiring_authority_status_id')
        .references('id')
        .inTable('hiring_authority_statuses');
    })
  }

  down () {
    this.table('hiring_authorities', (table) => {
      table.dropColumn('hiring_auhority_status_id');
    })
  }
}

module.exports = HiringAuthoritiesSchema
