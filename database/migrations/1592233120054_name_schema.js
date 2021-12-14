'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class NameSchema extends Schema {
  up () {
    this.create('names', (table) => {
      table.increments()
      table
        .integer('personal_information_id')
        .unsigned()
        .references('id')
        .inTable('personal_informations');
      table
        .integer('specialty_id')
        .unsigned()
        .references('id')
        .inTable('specialties');
      table
        .integer('subspecialty_id')
        .unsigned()
        .references('id')
        .inTable('subspecialties');
      table
        .integer('position_id')
        .unsigned()
        .references('id')
        .inTable('positions');
      table
        .integer('source_type_id')
        .unsigned()
        .references('id')
        .inTable('source_types');
      table
        .integer('name_type_id')
        .unsigned()
        .references('id')
        .inTable('name_types');
      table
        .string('email', 64)
        .unique();
      table.string('link_profile', 1024);
      table.string('title', 512);
      table.string('current_company', 512);
      table
        .integer('created_by')
        .unsigned()
        .references('id')
        .inTable('users');
      table
        .integer('updated_by')
        .unsigned()
        .references('id')
        .inTable('users');
      table.timestamps();
    })
  }

  down () {
    this.drop('names')
  }
}

module.exports = NameSchema
