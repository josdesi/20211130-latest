'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class SendoutInterviewSchema extends Schema {
  up () {
    this.table('sendout_interviews', (table) => {
      // alter table
      table.string('email', 254);
      table.string('full_name', 256);
      table.jsonb('cc_emails');
    })
  }

  down () {
    this.table('sendout_interviews', (table) => {
      // reverse alternations
      table.dropColumn('email');
      table.dropColumn('full_name');
      table.dropColumn('cc_emails');
    })
  }
}

module.exports = SendoutInterviewSchema
