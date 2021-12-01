'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class EmailTemplateSchema extends Schema {
  up() {
    this.create('email_templates', (table) => {
      table.increments();
      table.string('name', 254).notNullable();
      table.integer('created_by').unsigned().references('id').inTable('users');
      table.integer('email_body_id').unsigned().references('id').inTable('email_bodies').notNullable();
      table.integer('email_template_folder_id').unsigned().references('id').inTable('email_template_folders');
      table.timestamps();
    });
  }

  down() {
    this.drop('email_templates');
  }
}

module.exports = EmailTemplateSchema;
