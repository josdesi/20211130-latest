'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class SendgridEmailValidationSchema extends Schema {
  up() {
    this.raw(`
      CREATE INDEX IF NOT EXISTS sendgrid_lower_email_idx ON sendgrid_email_validations (lower(email));
    `);
  }

  down() {
    this.raw(`
      DROP INDEX sendgrid_lower_email_idx;
    `);
  }
}

module.exports = SendgridEmailValidationSchema;
