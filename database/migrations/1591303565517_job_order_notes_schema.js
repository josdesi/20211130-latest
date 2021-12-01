'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class JobOrderNotesSchema extends Schema {
  up () {
    this.table('job_order_notes', (table) => {
      table.string('title', 512).notNullable().alter();
    })
  }

  down () {
    this.table('job_order_notes', (table) => {
      table.string('title', 60).notNullable().alter();
    })
  }
}

module.exports = JobOrderNotesSchema
