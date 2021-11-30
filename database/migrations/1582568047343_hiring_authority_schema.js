'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class HiringAuthoritySchema extends Schema {
  up() {
    this.create('hiring_authorities', table => {
      table.increments();
      table
        .integer('company_id')
        .unsigned()
        .references('id')
        .inTable('companies');
      table.string('first_name', 45).notNullable();
      table.string('last_name', 45).notNullable();
      table.string('full_name', 128).notNullable();
      table.string('title', 254).notNullable();
      table
        .string('personal_email', 64)
        .unique();
      table.string('personal_phone', 20);
      table
        .string('work_email', 64)
        .notNullable()
        .unique();
      table.string('work_phone', 20);
      table.timestamps();
    });
  }

  down() {
    this.drop('hiring_authorities');
  }
}

module.exports = HiringAuthoritySchema;
