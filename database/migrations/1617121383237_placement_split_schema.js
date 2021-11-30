'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class PlacementSplitSchema extends Schema {
  up () {
    this.create('placement_splits', (table) => {
      table.increments()
      table.integer('placement_id')
        .notNullable()
        .references('id')
        .inTable('placements');
      table.integer('user_id')
        .notNullable()
        .references('id')
        .inTable('users');
      table.float('split_percentage')
      table.boolean('is_channel_partner').defaultTo(false);
      table.string('type');
      table.integer('created_by')
        .notNullable()
        .references('id')
        .inTable('users');
      table.integer('updated_by')
        .notNullable()
        .references('id')
        .inTable('users');
      table.timestamps()
    })
  }

  down () {
    this.drop('placement_splits')
  }
}

module.exports = PlacementSplitSchema
