'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class JobOrderNoteSchema extends Schema {
  up () {
    this.create('job_order_notes', (table) => {
      table.increments()
      table
        .integer('user_id')
        .unsigned()
        .references('id')
        .inTable('users');
      table
        .integer('job_order_id')
        .unsigned()
        .references('id')
        .inTable('job_orders');
      table.text('body')
      table.timestamps()
    })
  }

  down () {
    this.drop('job_order_notes')
  }
}

module.exports = JobOrderNoteSchema
