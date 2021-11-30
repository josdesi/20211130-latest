'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class JobOrderSchema extends Schema {
  up () {
    this.table('job_orders', (table) => {
      table.dropColumn('hiring_authority_id')
    })
  }

  down () {
    this.table('job_orders', (table) => {
      table
        .integer('hiring_authority_id')
        .unsigned()
        .references('id')
        .inTable('hiring_authorities');
    })
  }
}

module.exports = JobOrderSchema
