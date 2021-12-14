'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class AddSourceUrlhaSchema extends Schema {
  up () {
    this.table('hiring_authorities', (table) => {
      // alter table
      table
        .integer('source_type_id')
        .unsigned()
        .references('id')
        .inTable('source_types');
      table.string('link_profile', 254);
    })
  }

  down () {
    this.table('hiring_authorities', (table) => {
      // reverse alternations
      table.dropColumn('source_type_id');
      table.dropColumn('link_profile');
    })
  }
}

module.exports = AddSourceUrlhaSchema
