'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class CompanyHasCandidateEmployeeSchema extends Schema {
  up() {
    this.create('company_has_candidate_employees', (table) => {
      table.increments();
      table.integer('candidate_id').unsigned().references('id').inTable('candidates').notNullable();
      table.integer('company_id').unsigned().references('id').inTable('companies').notNullable();
      table.boolean('is_current_company').defaultTo(false).notNullable();
      table.integer('created_by').unsigned().references('id').inTable('users').notNullable();
      table.integer('updated_by').unsigned().references('id').inTable('users').notNullable();
      table.timestamps();
      table.unique(['candidate_id', 'company_id']);
      this.raw('CREATE UNIQUE INDEX ON company_has_candidate_employees (candidate_id) WHERE is_current_company;')
    });

  }

  down() {
    this.drop('company_has_candidate_employees');
  }
}

module.exports = CompanyHasCandidateEmployeeSchema;
