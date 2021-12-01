'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class UnsubscribeReasonSchema extends Schema {
  up() {
    this.create('unsubscribe_reasons', (table) => {
      table.increments();
      table.text('description').notNullable();
      table
        .integer('unsubscribe_reason_type_id')
        .unsigned()
        .references('id')
        .inTable('unsubscribe_reason_types')
        .notNullable();
      table.timestamps();
    });
  }

  down() {
    this.drop('unsubscribe_reasons');
  }
}

module.exports = UnsubscribeReasonSchema;
