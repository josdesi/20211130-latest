'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class JobOrderTypeLogSchema extends Schema {
  up () {
    this.create('job_order_type_logs', (table) => {
      table.increments();
      table.integer('job_order_id').unsigned().notNullable().references('id').inTable('job_orders');
      table.integer('job_order_type_id').unsigned().notNullable().references('id').inTable('job_order_types');
      table.integer('created_by').references('id').inTable('users');

      table.timestamps()
    })
  }

  down () {
    this.drop('job_order_type_logs')
  }
}

module.exports = JobOrderTypeLogSchema
