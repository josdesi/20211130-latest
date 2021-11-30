'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class RemoveUnusedJobOrderFieldSchema extends Schema {
  up () {
    this.table('job_orders', (table) => {
      // alter table
      table.dropColumn('pcr_record')
      table.dropColumn('pcr_record_changed')
    })
  }

  down () {
    this.table('job_orders', (table) => {
      // reverse alternations
      table.boolean('pcr_record_changed').defaultTo(false)
      table.boolean('pcr_record').defaultTo(false)
    })
  }
}

module.exports = RemoveUnusedJobOrderFieldSchema
