'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class AddLowerIndexOnFullNameSchema extends Schema {
  //For More infor about Indexes on Expressions
  //https://www.postgresql.org/docs/9.5/indexes-expressional.html
  up () {
    this.raw(`
      CREATE INDEX IF NOT EXISTS contacts_directory_lower_email_idx ON contacts_directory (lower(email));
      CREATE INDEX IF NOT EXISTS contacts_directory_lower_full_name_idx ON contacts_directory (lower(full_name));
    `)
  }

  down () {
    this.raw(`
      DROP INDEX contacts_directory_lower_email_idx;
      DROP INDEX contacts_directory_lower_full_name_idx;
    `)
  }
}

module.exports = AddLowerIndexOnFullNameSchema
