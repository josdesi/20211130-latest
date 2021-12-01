'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class NamesSchema extends Schema {
  up () {
    this.raw(`CREATE INDEX idx_names_lower_case_email ON names (lower(email))`);
   }
 
   down () {
     this.raw(`DROP INDEX idx_names_lower_case_email`);
   }
}

module.exports = NamesSchema
