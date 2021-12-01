'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');
const Database = use('Database');

class HiringAuthorityActivityLogSchema extends Schema {
  up() {
    this.create('hiring_authority_last_activity_logs', (table) => {
      table.integer('hiring_authority_id').primary().unsigned().references('id').inTable('hiring_authorities');
      table.integer('user_id').unsigned().references('id').inTable('users');
      table
        .integer('hiring_authority_activity_log_id')
        .unsigned()
        .references('id')
        .inTable('hiring_authority_activity_logs');
      table.integer('activity_log_type_id').unsigned().references('id').inTable('activity_log_types');
      table.text('body');
      table.timestamps();
      table.boolean('created_by_system');
      table.json('metadata');
      table.string('title', 256);
      table.string('user_name', 256);
    });

    this.schedule(async (transaction) => {
      const createUserIdIndex = 'CREATE INDEX on hiring_authority_last_activity_logs (user_id);';
      const createHaIdIndex = 'CREATE UNIQUE INDEX on hiring_authority_last_activity_logs (hiring_authority_id);';
      const createActivityLogTypeIdIndex =
        'CREATE INDEX on hiring_authority_last_activity_logs (activity_log_type_id);';
      const createCaActivityIdIndex =
        'CREATE INDEX on hiring_authority_last_activity_logs (hiring_authority_activity_log_id);';
      await Database.raw(createUserIdIndex).transacting(transaction);
      await Database.raw(createHaIdIndex).transacting(transaction);
      await Database.raw(createActivityLogTypeIdIndex).transacting(transaction);
      await Database.raw(createCaActivityIdIndex).transacting(transaction);
    });
  }
  down() {
    this.drop('hiring_authority_last_activity_logs');
  }
}

module.exports = HiringAuthorityActivityLogSchema;
