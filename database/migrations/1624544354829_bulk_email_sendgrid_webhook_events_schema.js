'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class BulkEmailSendgridWebhookEventsSchema extends Schema {
  up() {
    this.create('bulk_email_sendgrid_webhook_events', (table) => {
      table.increments();
      table.string('email', 128).notNullable().index();
      table.string('sendgrid_id', 128).notNullable().index();
      table.text('event');
      table.text('reason');
      table.timestamp('timestamp');
      table.json('raw_event'); //Loggin purpose, should never be used in-code
      table.timestamps();
    });
  }

  down() {
    this.drop('bulk_email_sendgrid_webhook_events');
  }
}

module.exports = BulkEmailSendgridWebhookEventsSchema;
