'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class NameActivityLogSchema extends Schema {
  up() {
    this.table('name_activity_logs', (table) => {
      // alter table
      table.json('metadata');
    });
  }

  down() {
    this.table('name_activity_logs', (table) => {
      // reverse alternations
      table.dropColumn('metadata');
    });
  }
}

module.exports = NameActivityLogSchema;
