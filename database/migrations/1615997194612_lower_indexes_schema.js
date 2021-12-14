'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class LowerIndexesSchema extends Schema {
  //For More infor about Indexes on Expressions
  //https://www.postgresql.org/docs/9.5/indexes-expressional.html
  up () {
    this.raw(`
      CREATE INDEX IF NOT EXISTS names_lower_email_idx ON names (lower(email));
      CREATE INDEX IF NOT EXISTS hiring_authorities_lower_email_idx ON hiring_authorities (lower(work_email));
      CREATE INDEX IF NOT EXISTS candidates_lower_email_idx ON candidates (lower(email));
    `)
  }

  down () {
    this.raw(`
      DROP INDEX names_lower_email_idx;
      DROP INDEX hiring_authorities_lower_email_idx;
      DROP INDEX candidates_lower_email_idx;
    `)
  }
}

module.exports = LowerIndexesSchema
