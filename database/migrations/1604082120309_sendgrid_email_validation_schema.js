'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class SendgridEmailValidationSchema extends Schema {
  up() {
    this.create('sendgrid_email_validations', (table) => {
      table.increments();
      table.string('email', 128).notNullable().index();
      table.boolean('is_valid').defaultTo(false);
      table.string('score', 32).defaultTo(false);
      table.text('suggestion'); //This comes directly from sendgrid
      table.jsonb('sendgrid_response').defaultTo(false);
      table.timestamps();
    });
  }

  down() {
    this.drop('sendgrid_email_validations');
  }
}

module.exports = SendgridEmailValidationSchema;
