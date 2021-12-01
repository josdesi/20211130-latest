'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class CompaniesSchema extends Schema {
  up () {
    const createGinIndex = `
    CREATE INDEX IF NOT EXISTS companies_gin_idx  ON companies USING gin (searchable_text gin_trgm_ops)`;
    this.raw(createGinIndex);
  }

  down () {
    this.raw(`DROP INDEX IF EXISTS companies_gin_idx`);
  }
}

module.exports = CompaniesSchema
