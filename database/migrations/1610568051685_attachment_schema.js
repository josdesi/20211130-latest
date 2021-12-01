'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class AttachmentSchema extends Schema {
  up() {
    this.table('attachments', (table) => {
      table.string('file_size', 16); //Who knows, maybe petabytes come sooner than later 👀
    });
  }

  down() {
    this.table('attachments', (table) => {
      // reverse alternations
      table.dropColumn('file_size');
    });
  }
}

module.exports = AttachmentSchema;
