'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');
const EmailOptOutTypeSeeder = require('../Seeds/EmailOptOutTypeSeeder');

class EmailOptOutTypeSchema extends Schema {
  up() {
    this.schedule(async (transaction) => {
      try {
        await EmailOptOutTypeSeeder.run(transaction);
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    });
  }

  down() {
    this.table('email_opt_out_types', (table) => {
      // reverse alternations
    });
  }
}

module.exports = EmailOptOutTypeSchema;
