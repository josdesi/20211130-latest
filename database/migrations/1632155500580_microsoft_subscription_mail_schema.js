'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class MicrosoftSubscriptionMailSchema extends Schema {
  static get connection() {
    return 'pg_analytics';
  }

  up() {
    this.create('microsoft_subscription_mails', (table) => {
      table.increments();
      table.integer('user_id').unsigned().index();
      table.string('conversation_id').notNullable().index();
      table.string('mail_id').notNullable().index();
      table.string('sender').notNullable().index();
      table.string('subject');
      table.jsonb('recipients');
      table.jsonb('cc_recipients');
      table.text('body');
      table.text('body_preview');
      table.timestamps();
    });
  }

  down() {
    this.drop('microsoft_subscription_mails');
  }
}

module.exports = MicrosoftSubscriptionMailSchema;
