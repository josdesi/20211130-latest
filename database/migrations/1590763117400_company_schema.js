'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class CompanySchema extends Schema {
  up () {
    this.table('companies', (table) => {
      // alter table
      table.string('website', 1024).alter();
      table.string('link_profile', 1024).alter();
    })
  }

  down () {
    this.table('companies', (table) => {
      // reverse alternations
      table.string('website', 254).alter();
      table.string('link_profile', 254).alter();
    })
  }
}

module.exports = CompanySchema
