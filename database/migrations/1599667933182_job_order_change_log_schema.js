'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class JobOrderChangeLogSchema extends Schema {
  up () {
    this.create('job_order_change_logs', (table) => {
      table.increments()
      table.integer('job_order_id').unsigned().notNullable().references('id').inTable('job_orders');
      table.integer('created_by').references('id').inTable('users');
      table.string('entity', 16).notNullable();
      table.string('operation', 16).notNullable();
      table.jsonb('payload');
      table.timestamps()
    })
  }

  down () {
    this.drop('job_order_change_logs')
  }
}

module.exports = JobOrderChangeLogSchema
