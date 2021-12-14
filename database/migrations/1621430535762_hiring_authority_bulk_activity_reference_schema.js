'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class HiringAuthorityBulkActivityReferenceSchema extends Schema {
  up() {
    this.create('hiring_authority_bulk_activity_references', (table) => {
      table.increments();
      table
        .integer('hiring_authority_activity_log_id')
        .unsigned()
        .references('id')
        .inTable('hiring_authority_activity_logs')
        .notNullable()
        .index();
      table.integer('email_history_id').unsigned().references('id').inTable('email_histories').notNullable().index();
      table.timestamps();
    });
  }

  down() {
    this.drop('hiring_authority_bulk_activity_references');
  }
}

module.exports = HiringAuthorityBulkActivityReferenceSchema;
