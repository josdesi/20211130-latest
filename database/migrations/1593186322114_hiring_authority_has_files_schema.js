'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class HiringAuthorityHasFilesSchema extends Schema {
  up () {
    this.create('hiring_authority_has_files', table => {
      table.increments();
      table
        .integer('hiring_authority_id')
        .unsigned()
        .references('id')
        .inTable('hiring_authorities');
      table
        .integer('file_type_id')
        .unsigned()
        .references('id')
        .inTable('file_types');
      table.text('url').notNullable();
      table.string('file_name',254)
      table.timestamps();
  });
}

  down () {
    this.drop('hiring_authority_has_files')
  }
}

module.exports = HiringAuthorityHasFilesSchema
