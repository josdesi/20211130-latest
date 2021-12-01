'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class CompaniesSchema extends Schema {
  up () {
    this.table('companies', (table) => {
      table.string('name', 512).notNullable().alter();
    })
  }

  down () {
    this.table('companies', (table) => {
      table.string('name', 254).notNullable().alter();
    })
  }
}

module.exports = CompaniesSchema
