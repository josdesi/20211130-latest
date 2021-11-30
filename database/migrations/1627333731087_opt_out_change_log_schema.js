'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class OptOutChangeLogSchema extends Schema {
  up() {
    this.create('opt_out_change_logs', (table) => {
      table.increments();
      table.string('email', 128).notNullable().unique();
      table.integer('created_by').references('id').inTable('users');
      table.string('entity', 16).notNullable();
      table.string('operation', 16).notNullable();
      table.jsonb('payload');
      table.timestamps();
    });
  }

  down() {
    this.drop('opt_out_change_logs');
  }
}

module.exports = OptOutChangeLogSchema;
