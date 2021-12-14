'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class AddSourceTypeJobOrderSchema extends Schema {
  up () {
    this.table('job_orders', (table) => {
      // alter table
      table
        .integer('job_order_source_type_id')
        .unsigned()
        .references('id')
        .inTable('job_order_source_types');
    })
  }

  down () {
    this.table('job_orders', (table) => {
      // reverse alternations
      table.dropColumn('job_order_source_type_id')
    })
  }
}

module.exports = AddSourceTypeJobOrderSchema
