'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class HiringAuthorityNotesSchema extends Schema {
  up () {
    this.create('hiring_authority_notes', (table) => {
      table.increments()
      table
        .integer('user_id')
        .unsigned()
        .references('id')
        .inTable('users');
      table
        .integer('hiring_authority_id')
        .unsigned()
        .references('id')
        .inTable('hiring_authorities');
      table.text('body')
      table.timestamps()
    })
  }

  down () {
    this.drop('hiring_authority_notes')
  }
}

module.exports = HiringAuthorityNotesSchema
