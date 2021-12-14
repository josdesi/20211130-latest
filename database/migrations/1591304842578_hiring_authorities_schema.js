'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class HiringAuthoritiesSchema extends Schema {
  up () {
    this.table('hiring_authorities', (table) => {
      table.string('first_name', 128).notNullable().alter();
      table.string('last_name', 128).notNullable().alter();
      table.string('full_name', 256).notNullable().alter();
      table.string('title', 512).notNullable().alter();
    })
  }

  down () {
    this.table('hiring_authorities', (table) => {
      table.string('first_name', 45).notNullable().alter();
      table.string('last_name', 45).notNullable().alter();
      table.string('full_name', 90).notNullable().alter();
      table.string('title', 254).notNullable().alter();
    })
  }
}

module.exports = HiringAuthoritiesSchema
