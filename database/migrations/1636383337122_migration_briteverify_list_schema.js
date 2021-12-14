'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class MigrationBriteverifyListSchema extends Schema {
  up() {
    this.create('migration_briteverify_lists', (table) => {
      table.increments();
      table.integer('migration_id').notNullable().references('id').inTable('migrations').index();
      table.string('email_list_id', 128).notNullable().index();
      table.timestamp('last_status_check');
      table.boolean('validation_failed').defaultTo(false);
      table.boolean('validation_finished').defaultTo(false);
      table.boolean('validation_stored').defaultTo(false);
      table.jsonb('validation_payload');
      table.timestamps();
    });
  }

  down() {
    this.drop('migration_briteverify_lists');
  }
}

module.exports = MigrationBriteverifyListSchema;
