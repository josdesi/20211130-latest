'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class EmailTrackingBlockListSchema extends Schema {
  up() {
    this.table('email_tracking_block_lists', (table) => {
      // alter table
      table.integer('created_by').references('id').inTable('users');
      table.text('notes');
    });
  }

  down() {
    this.table('email_tracking_block_lists', (table) => {
      // reverse alternations
      table.dropColumn('created_by');
      table.dropColumn('notes');
    });
  }
}

module.exports = EmailTrackingBlockListSchema;
