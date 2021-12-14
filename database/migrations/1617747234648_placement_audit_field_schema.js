'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class PlacementAuditFieldSchema extends Schema {
  up () {
    this.table('placements', (table) => {
      // alter table
      table.integer('created_by')
        .unsigned()
        .references('id')
        .inTable('users');
      table.integer('updated_by')
        .unsigned()
        .references('id')
        .inTable('users');
    })
  }

  down () {
    this.table('placements', (table) => {
      // reverse alternations
      table.dropColumn('created_by');
      table.dropColumn('updated_by');
    })
  }
}

module.exports = PlacementAuditFieldSchema
