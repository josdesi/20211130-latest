'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class BulkEmailFailureMessageSchema extends Schema {
  up() {
    this.create('bulk_email_failure_messages', (table) => {
      table.increments();
      table.integer('email_history_id').unsigned().references('id').inTable('email_histories');
      table.text('error_message');
      table.timestamps();
    });
  }

  down() {
    this.drop('bulk_email_failure_messages');
  }
}

module.exports = BulkEmailFailureMessageSchema;
