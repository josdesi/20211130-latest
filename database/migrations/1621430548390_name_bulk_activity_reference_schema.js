'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class NameBulkActivityReferenceSchema extends Schema {
  up() {
    this.create('name_bulk_activity_references', (table) => {
      table.increments();
      table
        .integer('name_activity_log_id')
        .unsigned()
        .references('id')
        .inTable('name_activity_logs')
        .notNullable()
        .index();
      table.integer('email_history_id').unsigned().references('id').inTable('email_histories').notNullable().index();
      table.timestamps();
    });
  }

  down() {
    this.drop('name_bulk_activity_references');
  }
}

module.exports = NameBulkActivityReferenceSchema;
