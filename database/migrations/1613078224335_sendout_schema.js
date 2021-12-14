'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class SendoutSchema extends Schema {
  up () {
    this.table('sendouts', (table) => {
      // alter table
      table.integer('sendout_type_id')
      .unsigned()
      .references('id')
      .inTable('sendout_types');
    })
  }

  down () {
    this.table('sendouts', (table) => {
      // reverse alternations
      table.dropColumn('sendout_type_id');
    })
  }
}

module.exports = SendoutSchema
