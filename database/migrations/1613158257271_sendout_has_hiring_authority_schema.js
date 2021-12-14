'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class SendoutHasHiringAuthoritySchema extends Schema {
  up () {
    this.table('sendout_has_hiring_authorities', (table) => {
      // alter table
      table.integer('created_by');
      table.integer('updated_by');
    })
  }

  down () {
    this.table('sendout_has_hiring_authorities', (table) => {
      // reverse alternations
      table.dropColumn('created_by');
      table.dropColumn('updated_by');
    })
  }
}

module.exports = SendoutHasHiringAuthoritySchema
