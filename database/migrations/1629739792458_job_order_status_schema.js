'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class JobOrderStatusSchema extends Schema {
  up () {
    this.table('job_order_statuses', (table) => {
      table.boolean('selectable').defaultTo(false);
    });
  }

  down () {
    this.table('job_order_statuses', (table) => {
      table.dropColumn('selectable');
    })
  }
}

module.exports = JobOrderStatusSchema
