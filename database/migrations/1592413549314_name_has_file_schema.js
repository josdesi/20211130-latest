'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class NameHasFileSchema extends Schema {
  up () {
    this.create('name_has_files', (table) => {
      table.increments();
      table
        .integer('name_id')
        .unsigned()
        .references('id')
        .inTable('names');
      table
        .integer('file_type_id')
        .unsigned()
        .references('id')
        .inTable('file_types');
      table.text('url').notNullable();
      table.string('file_name',254)
      table.timestamps();
    })
  }

  down () {
    this.drop('name_has_files')
  }
}

module.exports = NameHasFileSchema
