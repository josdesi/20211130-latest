'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class EmailUserUnsubscribeSchema extends Schema {
  up() {
    this.create('email_user_unsubscribes', (table) => {
      table.increments();
      table.string('email', 128).notNullable().unique();
      table.integer('unsubscribe_reason_id').unsigned().references('id').inTable('unsubscribe_reasons').notNullable();
      table.text('custom_reason'); //It is expected that unsubscribe_reason_id will be 'other' & a custom_reason will be typed
      table.integer('email_history_id').unsigned().references('id').inTable('email_histories'); //If the unsubscribe came from a bulk email it does not seems a bad idea to link that bulk reference
      table.timestamps();
    });
  }

  down() {
    this.drop('email_user_unsubscribes');
  }
}

module.exports = EmailUserUnsubscribeSchema;
