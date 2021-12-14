'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class SendgridWebhookEventSchema extends Schema {
  up() {
    this.create('sendgrid_webhook_events', (table) => {
      table.increments();
      table.string('email', 128).notNullable().index();
      table.string('sg_message_id', 128).index();
      table.text('event');
      table.text('reason');
      table.timestamp('timestamp');
      table.json('raw_event'); //Loggin purpose, should never be used in-code
      table.timestamps();
    });
  }

  down() {
    this.drop('sendgrid_webhook_events');
  }
}

module.exports = SendgridWebhookEventSchema;
