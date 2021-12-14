'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class PersonalInformationSchema extends Schema {
  up() {
    this.create('personal_informations', table => {
      table.increments();
      table
        .integer('contact_id')
        .unsigned()
        .references('id')
        .inTable('contacts');
      table
        .integer('address_id')
        .unsigned()
        .references('id')
        .inTable('addresses');
      table.string('first_name', 45).notNullable();
      table.string('last_name', 45).notNullable();
      table.string('full_name', 128).notNullable();      
      table.date('birthdate');
      table.timestamps();
      table.integer('created_by');
      table.integer('updated_by');
    });
  }
  down() {
    this.drop('personal_informations');
  }
}

module.exports = PersonalInformationSchema;
