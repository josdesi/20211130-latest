'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class PlacementStatusSchema extends Schema {
  up () {
    this.create('placement_statuses', (table) => {
      table.increments();
      table
        .string('title', 50)
        .notNullable()
        .unique();
      table
        .string('style',45)
        .notNullable()
        .unique();  
      table.timestamps();
      table.integer('created_by');
      table.integer('updated_by');
    });
  }

  down () {
    this.drop('placement_statuses')
  }
}

module.exports = PlacementStatusSchema
