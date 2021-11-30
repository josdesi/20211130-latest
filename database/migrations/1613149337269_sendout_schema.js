'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class SendoutSchema extends Schema {
  up () {
    this.table('sendouts', (table) => {
      // alter table
      table.dropColumn('status_id');
      table.integer('sendout_status_id')
      .unsigned()
      .references('id')
      .inTable('sendout_statuses');
    })
  }

  down () {
    this.table('sendouts', (table) => {
      // reverse alternations
      table.dropColumn('sendout_status_id');
      table.integer('status_id')
      .unsigned()
      .references('id')
      .inTable('sendout_statuses');
    })
  }
}

module.exports = SendoutSchema
