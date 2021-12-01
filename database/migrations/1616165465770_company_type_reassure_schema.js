'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class CompanyTypeReassureSchema extends Schema {
  up() {
    this.table('company_type_reassures', (table) => {
      // alter table
      table.datetime('verification_date');
      table.integer('verified_by').unsigned().references('id').inTable('users');
      table.integer('verified_company_type_id').references('id').inTable('company_types');
    });
  }

  down() {
    this.table('company_type_reassures', (table) => {
      // reverse alternations
      this.drop('verification_date');
      this.drop('verified_by');
      this.drop('verified_company_type_id');
    });
  }
}

module.exports = CompanyTypeReassureSchema;
