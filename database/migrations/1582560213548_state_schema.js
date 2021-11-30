'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class StatesSchema extends Schema {
  up() {
    this.create('states', table => {
      table.increments();
      table
        .integer('country_id')
        .unsigned()
        .references('id')
        .inTable('countries');
      table
        .string('title', 50)
        .notNullable()
        .unique();
      table
        .string('slug', 3)
        .notNullable()
        .unique();
      table.specificType('coordinates', 'POINT');
      table.timestamps();
    });
  }

  down() {
    this.drop('states');
  }
}

module.exports = StatesSchema;
