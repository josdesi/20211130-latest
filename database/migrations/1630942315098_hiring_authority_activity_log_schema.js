'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class HiringAuthorityActivityLogSchema extends Schema {
  up() {
    this.table('hiring_authority_activity_logs', (table) => {
      // alter table
      table.boolean('created_by_system').defaultTo(false);
    });
  }

  down() {
    this.table('hiring_authority_activity_logs', (table) => {
      // reverse alternations
      table.dropColumn('created_by_system');
    });
  }
}

module.exports = HiringAuthorityActivityLogSchema;
