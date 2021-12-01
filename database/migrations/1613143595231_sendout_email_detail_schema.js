'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class SendoutEmailDetailSchema extends Schema {
  up () {
    this.table('sendout_email_details', (table) => {
      // alter table
      table.integer('created_by');
      table.integer('updated_by');
    })
  }

  down () {
    this.table('sendout_email_details', (table) => {
      // reverse alternations
      table.dropColumn('created_by');
      table.dropColumn('updated_by');
    })
  }
}

module.exports = SendoutEmailDetailSchema
