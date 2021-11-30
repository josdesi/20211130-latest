'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class CompanyChangeLogSchema extends Schema {
  up() {
    this.create('company_change_logs', (table) => {
      table.increments();
      table.integer('company_id').unsigned().notNullable().references('id').inTable('companies');
      table.integer('created_by').references('id').inTable('users');
      table.string('entity', 16).notNullable();
      table.string('operation', 16).notNullable();
      table.jsonb('payload');
      table.timestamps();
    });
  }

  down() {
    this.drop('company_change_logs');
  }
}

module.exports = CompanyChangeLogSchema;
