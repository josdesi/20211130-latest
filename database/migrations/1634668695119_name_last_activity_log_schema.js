'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');
const Database = use('Database');

class NameActivityLogSchema extends Schema {
  up() {
    this.create('name_last_activity_logs', (table) => {
      table.integer('name_id').primary().unsigned().references('id').inTable('names');
      table.integer('user_id').unsigned().references('id').inTable('users');
      table.integer('name_activity_log_id').unsigned().references('id').inTable('name_activity_logs');
      table.integer('activity_log_type_id').unsigned().references('id').inTable('activity_log_types');
      table.text('body');
      table.timestamps();
      table.boolean('created_by_system');
      table.json('metadata');
      table.string('title', 256);
      table.string('user_name', 256);
    });

    this.schedule(async (transaction) => {
      const createUserIdIndex = 'CREATE INDEX on name_last_activity_logs (user_id);';
      const createNameIdIndex = 'CREATE UNIQUE INDEX on name_last_activity_logs (name_id);';
      const createActivityLogTypeIdIndex = 'CREATE INDEX on name_last_activity_logs (activity_log_type_id);';
      const createNameActivityIdIndex = 'CREATE INDEX on name_last_activity_logs (name_activity_log_id);';
      await Database.raw(createUserIdIndex).transacting(transaction);
      await Database.raw(createNameIdIndex).transacting(transaction);
      await Database.raw(createActivityLogTypeIdIndex).transacting(transaction);
      await Database.raw(createNameActivityIdIndex).transacting(transaction);
    });
  }

  down() {
    this.drop('name_last_activity_logs');
  }
}

module.exports = NameActivityLogSchema;
