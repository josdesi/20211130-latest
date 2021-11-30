'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class EmailTrackingBlockListSchema extends Schema {
  up() {
    const createIndex = `CREATE INDEX IF NOT EXISTS email_tracking_block_lower_email_idx ON email_tracking_block_lists (lower(email))`;
    this.raw(createIndex);
  }

  down() {
    this.raw(`DROP INDEX IF EXISTS email_tracking_block_lower_email_idx`);
  }
}

module.exports = EmailTrackingBlockListSchema;
