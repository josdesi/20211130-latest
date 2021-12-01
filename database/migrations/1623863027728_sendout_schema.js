'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class SendoutSchema extends Schema {
  up () {
    this.table('sendouts', (table) => {
      // alter table
      table
        .integer('company_owner_id')
        .unsigned()
        .references('id')
        .on('users');
      table
        .integer('candidate_owner_id')
        .unsigned()
        .references('id')
        .on('users');
    })
  }

  down () {
    this.table('sendouts', (table) => {
      // reverse alternations
      table.dropColumn('company_owner_id');
      table.dropColumn('candidate_owner_id');
    })
  }
}

module.exports = SendoutSchema
