'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');
const UnsubscribeReasonTypeSeeder = require('../Seeds/UnsubscribeReasonTypeSeeder');

class UnsubscribeReasonTypeSchema extends Schema {
  up() {
    this.schedule(async (transaction) => {
      try {
        await UnsubscribeReasonTypeSeeder.run(transaction);
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    });
  }

  down() {
    this.table('unsubscribe_reason_types', (table) => {
      // reverse alternations
    });
  }
}

module.exports = UnsubscribeReasonTypeSchema;
