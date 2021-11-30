'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class IndustrySchema extends Schema {
  up () {
    this.table('industries', (table) => {
      // alter table
      table.string('email', 254);
    })
  }

  down () {
    this.table('industries', (table) => {
      // reverse alternations
      table.dropColumn('email');
    })
  }
}

module.exports = IndustrySchema
