'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class ZipCodeSchema extends Schema {
  up() {
    this.create('zip_codes', (table) => {
      table.increments();
      table.integer('zip').notNullable().unique();
      table.integer('city_id').unsigned().references('id').inTable('cities').notNullable();
      table.integer('state_id').unsigned().references('id').inTable('states').notNullable();
      table.float('latitude');
      table.float('longitude');
      table.string('zip_ch');
      table.timestamps();
    });
  }

  down() {
    this.drop('zip_codes');
  }
}

module.exports = ZipCodeSchema;
