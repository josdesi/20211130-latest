'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class EmailBodySchema extends Schema {
  up() {
    this.create('email_bodies', (table) => {
      table.increments();
      table.string('subject', 254);
      table.text('text');
      table.text('html');
      table.timestamps();
    });
  }

  down() {
    this.drop('email_bodies');
  }
}

module.exports = EmailBodySchema;
