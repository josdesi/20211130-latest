'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class VerificationCodeSchema extends Schema {
  up() {
    this.create('verification_codes', (table) => {
      table.increments();
      table.string('email', 254).notNullable();
      table.string('code', 5).notNullable();
      table.boolean('is_valid').defaultTo(true);
      table.timestamps();
    });
  }

  down() {
    this.drop('verification_codes');
  }
}

module.exports = VerificationCodeSchema;
