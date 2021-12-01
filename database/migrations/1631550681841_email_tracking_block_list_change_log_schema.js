'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class EmailTrackingBlockListChangeLogSchema extends Schema {
  up() {
    this.create('email_tracking_block_list_change_logs', (table) => {
      table.increments();
      table.string('email', 128).notNullable();
      table.integer('created_by').references('id').inTable('users');
      table.string('entity', 16).notNullable();
      table.string('operation', 16).notNullable();
      table.jsonb('payload');
      table.timestamps();
    });
  }

  down() {
    this.drop('email_tracking_block_list_change_logs');
  }
}

module.exports = EmailTrackingBlockListChangeLogSchema;
