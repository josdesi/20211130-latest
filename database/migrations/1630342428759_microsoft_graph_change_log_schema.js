'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class MicrosoftGraphChangeLogSchema extends Schema {
  up() {
    this.create('microsoft_graph_change_logs', (table) => {
      table.increments();
      table.string('email', 128).notNullable();
      table.integer('created_by').references('id').inTable('users');
      table.string('entity', 24).notNullable();
      table.string('operation', 24).notNullable();
      table.jsonb('payload');
      table.timestamps();
    });
  }

  down() {
    this.drop('microsoft_graph_change_logs');
  }
}

module.exports = MicrosoftGraphChangeLogSchema;
