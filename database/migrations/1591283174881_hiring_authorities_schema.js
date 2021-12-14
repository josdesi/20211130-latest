'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class HiringAuthoritiesSchema extends Schema {
  up () {
    this.table('hiring_authorities', (table) => {
      table.string('ext', 64).nullable();
    })
  }

  down () {
    this.table('hiring_authorities', (table) => {
      table.dropColumn('ext');
    })
  }
}

module.exports = HiringAuthoritiesSchema
