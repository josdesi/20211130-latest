'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class JobOrderNoteSchema extends Schema {
  up () {
    this.table('job_order_notes', (table) => {
      // alter table
      table.string('title',60)
    })
  }

  down () {
    this.table('job_order_notes', (table) => {
      // reverse alternations
    })
  }
}

module.exports = JobOrderNoteSchema
