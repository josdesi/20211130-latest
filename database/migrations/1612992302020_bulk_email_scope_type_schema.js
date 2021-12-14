'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class BulkEmailScopeTypeSchema extends Schema {
  up() {
    this.create('bulk_email_scope_types', (table) => {
      table.increments();
      table.string('title', 25).notNullable().unique();
      table.timestamps();
    });
  }

  down() {
    this.drop('bulk_email_scope_types');
  }
}

module.exports = BulkEmailScopeTypeSchema;
