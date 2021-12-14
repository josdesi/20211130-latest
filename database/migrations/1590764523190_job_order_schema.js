'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class JobOrderSchema extends Schema {
  up () {
    this.table('job_orders', (table) => {
      // alter table
      table.string('source', 1024).alter();
    })
  }

  down () {
    this.table('job_orders', (table) => {
      // reverse alternations
      table.string('source', 254).alter();
    })
  }
}

module.exports = JobOrderSchema
