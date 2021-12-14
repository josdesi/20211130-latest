'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class JobOrderSchema extends Schema {
  up () {
    this.table('job_orders', (table) => {
      // alter table
      table.boolean('pcr_record_changed').defaultTo(false)
    })
  }

  down () {
    this.table('job_orders', (table) => {
      // reverse alternations
      table.dropColumn('pcr_record_changed')
    })
  }
}

module.exports = JobOrderSchema
