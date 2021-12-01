'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class EmailTrackingBlockListSchema extends Schema {
  up() {
    this.create('email_tracking_block_lists', (table) => {
      table.increments();
      table.string('email', 128).notNullable().unique();
      table.boolean('block_to').defaultTo(true);
      table.boolean('block_from').defaultTo(true);
      table.timestamps();
    });
  }

  down() {
    this.drop('email_tracking_block_lists');
  }
}

module.exports = EmailTrackingBlockListSchema;
