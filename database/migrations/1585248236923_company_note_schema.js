'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class CompanyNoteSchema extends Schema {
  up () {
    this.create('company_notes', (table) => {
      table.increments()
      table
        .integer('user_id')
        .unsigned()
        .references('id')
        .inTable('users');
      table
        .integer('company_id')
        .unsigned()
        .references('id')
        .inTable('companies');
      table.text('body')
      table.timestamps()
    })
  }

  down () {
    this.drop('company_notes')
  }
}

module.exports = CompanyNoteSchema
