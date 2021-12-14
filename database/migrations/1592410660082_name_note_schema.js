'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class NameNoteSchema extends Schema {
  up () {
    this.create('name_notes', (table) => {
      table.increments()
      table
        .integer('user_id')
        .unsigned()
        .references('id')
        .inTable('users');
      table
        .integer('name_id')
        .unsigned()
        .references('id')
        .inTable('names');
      table.string('title', 512);
      table.text('body')
      table.timestamps()
    })
  }

  down () {
    this.drop('name_notes')
  }
}

module.exports = NameNoteSchema
