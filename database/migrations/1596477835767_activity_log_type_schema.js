'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');
const Database = use('Database');

class ActivityLogTypeSchema extends Schema {
  up() {
    this.schedule(async (transaction) => {
      await Database.table('activity_log_types')
        .transacting(transaction)
        .insert([{ id: 21, title: 'Sendover' }]);
    });
  }
}

module.exports = ActivityLogTypeSchema;
