'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class CompanySchema extends Schema {
  up() {
    this.table('companies', (table) => {
      // alter table
      table.dropUnique('email');
    });
  }

  down() {
    this.table('companies', (table) => {
      // reverse alternations
      table.string('email').unique().alter();
    });
  }
}

module.exports = CompanySchema;
