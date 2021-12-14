'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class ContactsDirectoryTrgIndexSchema extends Schema {
  up () {
    const createGinIndex = `
    CREATE INDEX IF NOT EXISTS contacts_directory_gin_idx  ON contacts_directory USING gin  (searchable_text gin_trgm_ops)`;
    this.raw(createGinIndex);
  }

  down () {
    this.raw(`DROP INDEX IF EXISTS contacts_directory_gin_idx`);
  }
}

module.exports = ContactsDirectoryTrgIndexSchema
