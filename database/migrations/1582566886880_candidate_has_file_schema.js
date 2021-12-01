'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class CandidateHasFileSchema extends Schema {
  up() {
    this.create('candidate_has_files', table => {
      table.increments();
      table
        .integer('candidate_id')
        .unsigned()
        .references('id')
        .inTable('candidates');
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

  down() {
    this.drop('candidate_has_files');
  }
}

module.exports = CandidateHasFileSchema;
