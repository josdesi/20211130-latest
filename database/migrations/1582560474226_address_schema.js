'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class AddressesSchema extends Schema {
  up() {
    this.create('addresses', table => {
      table.increments();
      table
        .integer('city_id')
        .unsigned()
        .references('id')
        .inTable('cities');
      table.string('address', 250);
      table.string('zip', 8).notNullable();
      table.specificType('coordinates', 'POINT');
      table.timestamps();
    });
  }

  down() {
    this.drop('addresses');
  }
}

module.exports = AddressesSchema;
