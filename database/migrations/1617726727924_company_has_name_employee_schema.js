'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class CompanyHasNameEmployeeSchema extends Schema {
  up() {
    this.create('company_has_name_employees', (table) => {
      table.increments();
      table.integer('name_id').unsigned().references('id').inTable('names').notNullable();
      table.integer('company_id').unsigned().references('id').inTable('companies').notNullable();
      table.boolean('is_current_company').defaultTo(false).notNullable();
      table.integer('created_by').unsigned().references('id').inTable('users').notNullable();
      table.integer('updated_by').unsigned().references('id').inTable('users').notNullable();
      table.timestamps();
      table.unique(['name_id', 'company_id']);
      this.raw('CREATE UNIQUE INDEX ON company_has_name_employees (name_id) WHERE is_current_company;');
    });
  }

  down() {
    this.drop('company_has_name_employees');
  }
}

module.exports = CompanyHasNameEmployeeSchema;
