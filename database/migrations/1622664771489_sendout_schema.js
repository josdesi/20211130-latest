'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class SendoutSchema extends Schema {
  up () {
    this.table('sendouts', (table) => {
      // alter table
      table.boolean('send_email_hiring');
    })
  }

  down () {
    this.table('sendouts', (table) => {
      // reverse alternations
      table.dropColumn('send_email_hiring');
    })
  }
}

module.exports = SendoutSchema
