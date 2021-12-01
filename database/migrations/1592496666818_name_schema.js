'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const { nameStatus } = use('App/Helpers/Globals');

class NameSchema extends Schema {
  up () {
    this.table('names', (table) => {
      // alter table
      table
        .integer('name_status_id')
        .unsigned()
        .references('id')
        .inTable('name_statuses');
    })
  }

  down () {
    this.table('names', (table) => {
      // reverse alternations
      table.dropColumn('name_status_id')
    })
  }
}

module.exports = NameSchema
