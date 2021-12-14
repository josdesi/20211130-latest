'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class CitiesSchema extends Schema {
  up() {
    this.create('cities', table => {
      table.increments();
      table
        .integer('state_id')
        .unsigned()
        .references('id')
        .inTable('states');
      table
        .string('title', 50)
        .notNullable()
      table.timestamps();
    });
  }

  down() {
    this.drop('cities');
  }
}

module.exports = CitiesSchema;
