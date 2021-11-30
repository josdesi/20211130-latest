'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class OptOutChangeLogSchema extends Schema {
  up() {
    this.table('opt_out_change_logs', (table) => {
      // alter table
      table.dropUnique('email');
    });
  }

  down() {
    this.table('opt_out_change_logs', (table) => {
      // reverse alternations
      table.string('email', 128).notNullable().unique().alter();
    });
  }
}

module.exports = OptOutChangeLogSchema;
