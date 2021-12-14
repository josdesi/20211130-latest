'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class SendgridEmailValidationSchema extends Schema {
  up() {
    const verdictIndex =
      "CREATE INDEX IF NOT EXISTS sendgrid_verdict_idx ON sendgrid_email_validations ((LOWER(sendgrid_response->>'verdict')));";

    this.raw(verdictIndex);
  }

  down() {
    this.raw('DROP INDEX sendgrid_verdict_idx;');
  }
}

module.exports = SendgridEmailValidationSchema;
