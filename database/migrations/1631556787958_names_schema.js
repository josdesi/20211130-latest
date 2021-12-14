'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class NamesSchema extends Schema {
  up () {
    const createGinIndex = `
    CREATE INDEX IF NOT EXISTS names_gin_idx  ON names USING gin (searchable_text gin_trgm_ops)`;
    this.raw(createGinIndex);
  }

  down () {
    this.raw(`DROP INDEX IF EXISTS names_gin_idx`);
  }
}

module.exports = NamesSchema
