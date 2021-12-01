'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class EmailUserUnsubscribeSchema extends Schema {
  up() {
    const createGinIndex = `
    CREATE INDEX IF NOT EXISTS email_user_unsubscribe_gin_idx ON email_user_unsubscribes USING gin (email gin_trgm_ops)`;
    this.raw(createGinIndex);
  }

  down() {
    this.raw(`DROP INDEX IF EXISTS email_user_unsubscribe_gin_idx`);
  }
}

module.exports = EmailUserUnsubscribeSchema;
