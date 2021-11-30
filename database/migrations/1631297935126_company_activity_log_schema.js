'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class CompanyActivityLogSchema extends Schema {
  up() {
    this.table('company_activity_logs', (table) => {
      // alter table
      table.json('metadata');
    });
  }

  down() {
    this.table('company_activity_logs', (table) => {
      // reverse alternations
      table.dropColumn('metadata');
    });
  }
}

module.exports = CompanyActivityLogSchema;
