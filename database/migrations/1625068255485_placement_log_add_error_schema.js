'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class PlacementLogAddErrorSchema extends Schema {
  up () {
    this.table('placement_logs', (table) => {
      // alter table
      table.boolean('successful_operation').defaultTo(true);
      table.integer('placement_id').unsigned().nullable().references('id').inTable('placements').alter();
    })
  }

  down () {
    this.table('placement_logs', (table) => {
      // reverse alternations
      table.dropColumn('successful_operation');
      table.integer('placement_id').unsigned().notNullable().references('id').inTable('placements').alter();
    })
  }
}

module.exports = PlacementLogAddErrorSchema
