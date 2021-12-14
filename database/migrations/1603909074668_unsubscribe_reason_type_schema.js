'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class UnsubscribeReasonTypeSchema extends Schema {
  up() {
    this.create('unsubscribe_reason_types', (table) => {
      table.increments();
      table.string('title').notNullable();
      table.timestamps();
    });
  }

  down() {
    this.drop('unsubscribe_reason_types');
  }
}

module.exports = UnsubscribeReasonTypeSchema;
