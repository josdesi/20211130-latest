'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class EmailHistorySchema extends Schema {
  up() {
    this.create('email_histories', (table) => {
      table.increments();
      table.integer('created_by').unsigned().references('id').inTable('users');
      table.boolean('is_sent').defaultTo(false);
      table.timestamp('send_date');
      table.integer('search_project_id').unsigned().references('id').inTable('search_projects');
      table.integer('email_template_id').unsigned().references('id').inTable('email_templates');
      table.integer('email_body_id').unsigned().references('id').inTable('email_bodies');
      table.boolean('block_resend').defaultTo(false);
      table.timestamp('block_duration_end');
      table.jsonb('emails_sent');
      table.jsonb('emails_blocked');
      table.jsonb('emails_invalid');
      table.text('sendgrid_id');
      table.jsonb('sendgrid_success');
      table.jsonb('sendgrid_failures');
      table.timestamps();
    });
  }

  down() {
    this.drop('email_histories');
  }
}

module.exports = EmailHistorySchema;
