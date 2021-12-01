'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class ContactSchema extends Schema {
  up() {
    this.create('contacts', table => {
      table.increments();
      table.string('phone', 20);
      table.integer('ext');
      table.string('mobile', 20);
      table.string('personal_email', 64)
      table.timestamps();
    });
  }

  down() {
    this.drop('contacts');
  }
}

module.exports = ContactSchema;
