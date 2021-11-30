'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class HiringAuthoritySchema extends Schema {
  up () {
    this.table('hiring_authorities', (table) => {
      // alter table
      table.string('pcr_status');
    })
  }

  down () {
    this.table('hiring_authorities', (table) => {
      // reverse alternations
      table.dropColumn('pcr_status');
    })
  }
}

module.exports = HiringAuthoritySchema
