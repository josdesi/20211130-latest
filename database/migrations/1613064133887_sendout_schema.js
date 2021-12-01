'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class SendoutSchema extends Schema {
  up () {
    this.table('sendouts', (table) => {
      // alter table
      table.integer('fee_amount');
      table.integer('sendout_email_detail_id')
      .unsigned()
      .references('id')
      .inTable('sendout_email_details');
      table.dropColumn('compensation')
      table.dropColumn('percent')
      table.dropColumn('notes');
    })
  }

  down () {
    this.table('sendouts', (table) => {
      // reverse alternations
      table.integer('compensation')
      table.integer('percent')
      table.text('notes', 4000);
      table.dropColumn('fee_amount');
      table.dropColumn('sendout_email_detail_id');
    })
  }
}

module.exports = SendoutSchema
