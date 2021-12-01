'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class DropUniqueStylePlacementStatusSchema extends Schema {
  up () {
    this.table('placement_statuses', (table) => {
      // alter table
      table.dropUnique('style',);
    })
  }

  down () {
    this.table('placement_statuses', (table) => {
      // reverse alternations
      table.string('style',45).unique().alter();
    })
  }
}

module.exports = DropUniqueStylePlacementStatusSchema
