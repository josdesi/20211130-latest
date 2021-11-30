'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');
const UnsubscribeReasonSeeder = require('../Seeds/UnsubscribeReasonSeeder');

class UnsubscribeReasonSchema extends Schema {
  up() {
    this.schedule(async (transaction) => {
      try {
        await UnsubscribeReasonSeeder.run(transaction);
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    });
  }

  down() {
    this.table('unsubscribe_reasons', (table) => {
      // reverse alternations
    });
  }
}

module.exports = UnsubscribeReasonSchema;
