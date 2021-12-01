'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class EmailOptOutSchema extends Schema {
  up() {
    this.table('email_opt_outs', (table) => {
      // alter table
      table.text('notes');
    });
  }

  down() {
    this.table('email_opt_outs', (table) => {
      // reverse alternations
      table.dropColumn('notes');
    });
  }
}

module.exports = EmailOptOutSchema;
