'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class FileTypeSchema extends Schema {
  up() {
    this.create('file_types', table => {
      table.increments();
      table
        .string('title', 25)
        .notNullable()
        .unique();
      table.timestamps();
      table.integer('created_by');
      table.integer('updated_by');
    });
  }

  down() {
    this.drop('file_types');
  }
}

module.exports = FileTypeSchema;
