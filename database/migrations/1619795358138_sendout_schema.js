'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class SendoutSchema extends Schema {
  up () {
    this.table('sendouts', (table) => {
      // alter table
      table.jsonb('declination_details');
    })
  }

  down () {
    this.table('sendouts', (table) => {
      // reverse alternations
      table.dropColumn('declination_details');
    })
  }
}

module.exports = SendoutSchema
