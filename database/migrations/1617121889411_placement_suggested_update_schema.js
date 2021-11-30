'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class PlacementSuggestedUpdateSchema extends Schema {
  up () {
    this.create('placement_suggested_updates', (table) => {
      table.increments()
      table.integer('placement_id')
        .notNullable()
        .references('id')
        .inTable('placements');
      table.integer('user_id')
        .notNullable()
        .references('id')
        .inTable('users');
      table.text('description');
      table.timestamps()
    })
  }

  down () {
    this.drop('placement_suggested_updates')
  }
}

module.exports = PlacementSuggestedUpdateSchema
