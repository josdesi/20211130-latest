'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class AddSendoutToPlacementSchema extends Schema {
  up () {
    this.table('placements', (table) => {
      // alter table
      table.integer('sendout_id')
        .unsigned()
        .references('id')
        .inTable('sendouts')
        .notNullable();
    })
  }

  down () {
    this.table('placements', (table) => {
      // reverse alternations
      table.dropColumn('sendout_id')
    })
  }
}

module.exports = AddSendoutToPlacementSchema
