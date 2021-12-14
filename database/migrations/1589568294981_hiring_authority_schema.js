'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class HiringAuthoritySchema extends Schema {
  up () {
    this.table('hiring_authorities', (table) => {
      // alter table
      table.boolean('pcr_record').defaultTo(false)
    })
  }

  down () {
    this.table('hiring_authorities', (table) => {
      // reverse alternations
      table.dropColumn('pcr_record')
    })
  }
}

module.exports = HiringAuthoritySchema
