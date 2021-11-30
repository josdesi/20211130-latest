'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class EmailBodySchema extends Schema {
  up() {
    this.table('email_bodies', (table) => {
      table.index('subject');
    });
  }

  down() {
    this.table('email_bodies', (table) => {
      table.dropIndex('subject');
    });
  }
}

module.exports = EmailBodySchema;
