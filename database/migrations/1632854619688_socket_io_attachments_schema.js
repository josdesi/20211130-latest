'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class SocketIoAttachmentsSchema extends Schema {
  up() {
    this.raw(`
      CREATE TABLE IF NOT EXISTS socket_io_attachments (
          id          bigserial UNIQUE,
          created_at  timestamptz DEFAULT NOW(),
          payload     bytea
      );
    `);
  }

  down() {
    this.drop('socket_io_attachments');
  }
}

module.exports = SocketIoAttachmentsSchema;
