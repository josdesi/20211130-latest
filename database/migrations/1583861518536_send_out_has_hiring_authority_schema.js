'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class SendOutHasHiringAuthoritySchema extends Schema {
  up () {
    this.create('send_out_has_hiring_authorities', (table) => {
      table.increments()
      table
        .integer('sendout_id')
        .unsigned()
        .references('id')
        .inTable('sendouts');
      table
        .integer('hiring_authority_id')
        .unsigned()
        .references('id')
        .inTable('hiring_authorities');
      table.timestamps()
    })
  }

  down () {
    this.drop('send_out_has_hiring_authorities')
  }
}

module.exports = SendOutHasHiringAuthoritySchema
