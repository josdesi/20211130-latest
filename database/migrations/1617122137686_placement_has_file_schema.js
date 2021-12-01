'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class PlacementHasFileSchema extends Schema {
  up () {
    this.create('placement_has_files', (table) => {
      table.increments();
      table
        .integer('placement_id')
        .unsigned()
        .references('id')
        .inTable('placements');
      table
        .integer('file_type_id')
        .unsigned()
        .references('id')
        .inTable('file_types');
      table.text('url').notNullable();
      table.string('file_name',254)
      table.timestamps();
    })
  }

  down () {
    this.drop('placement_has_files')
  }
}

module.exports = PlacementHasFileSchema
