'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class PlacementChangeLogSchema extends Schema {
  up () {
    this.create('placement_change_logs', (table) => {
      table.increments()
      table.integer('placement_id').unsigned().notNullable().references('id').inTable('placements');
      table.integer('created_by').references('id').inTable('users');
      table.string('entity', 16).notNullable();
      table.string('operation', 16).notNullable();
      table.jsonb('payload');
      table.timestamps()
    })
  }

  down () {
    this.drop('placement_change_logs')
  }
}

module.exports = PlacementChangeLogSchema
