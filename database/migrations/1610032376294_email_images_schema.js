'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class EmailImagesSchema extends Schema {
  up() {
    this.create('email_images', (table) => {
      table.increments();
      table.integer('user_id').unsigned().references('id').on('users');
      table.text('url').notNullable();
      table.string('file_name', 254);
      table.string('original_name', 254);
      table.timestamps();
    });
  }

  down() {
    this.drop('email_images');
  }
}

module.exports = EmailImagesSchema;
