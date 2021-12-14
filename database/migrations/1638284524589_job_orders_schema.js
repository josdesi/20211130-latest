'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class JobOrdersSchema extends Schema {
  up () {
    this.table('job_orders', (table) => {
      table.specificType('coordinates', 'GEOGRAPHY(POINT,4326)');
    })
  }

  down () {
    this.table('job_orders', (table) => {
      table.dropColumn('coordinates');
    })
  }
}

module.exports = JobOrdersSchema
