'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class PositionSchema extends Schema {
  up() {
    this.create('positions', table => {
      table.increments();
      table
        .integer('industry_id')
        .unsigned()
        .references('id')
        .inTable('industries');
      table.text('title', 250).notNullable();
      table.timestamps();
      table.integer('created_by');
      table.integer('updated_by');
    });
  }

  down() {
    this.drop('positions');
  }
}

module.exports = PositionSchema;
