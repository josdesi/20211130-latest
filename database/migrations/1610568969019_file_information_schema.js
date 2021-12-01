'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class FileInformationSchema extends Schema {
  up() {
    this.create('file_informations', (table) => {
      table.increments();
      table.integer('user_has_temp_file_id').unsigned().references('id').on('user_has_temp_files');
      table.string('file_size', 16);
      table.timestamps();
    });
  }

  down() {
    this.drop('file_informations');
  }
}

module.exports = FileInformationSchema;
