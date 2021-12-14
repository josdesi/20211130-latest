'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class AttachmentSchema extends Schema {
  up() {
    this.create('attachments', (table) => {
      table.increments();
      table.integer('email_body_id').unsigned().references('id').inTable('email_bodies').notNullable();
      table.string('name', 254).notNullable();
      table.text('url').notNullable();
      table.timestamps();
    });
  }

  down() {
    this.drop('attachments');
  }
}

module.exports = AttachmentSchema;
