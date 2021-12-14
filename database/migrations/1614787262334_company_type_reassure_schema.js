'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class CompanyTypeReassureSchema extends Schema {
  up() {
    this.create('company_type_reassures', (table) => {
      table.increments();
      table.integer('company_id').unsigned().references('id').inTable('companies').notNullable().index();
      table.integer('company_type_id').references('id').inTable('company_types').notNullable();
      table.integer('company_has_file_id').references('id').inTable('company_has_files');
      table.integer('user_id').unsigned().references('id').inTable('users').notNullable();
      table.boolean('is_coach_reassure').defaultTo(false).notNullable();
      table.timestamps();
    });
  }

  down() {
    this.drop('company_type_reassures');
  }
}

module.exports = CompanyTypeReassureSchema;
