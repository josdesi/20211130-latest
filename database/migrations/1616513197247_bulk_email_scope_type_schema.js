'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');
const BulkEmailScopeTypeSeeder = require('../Seeds/BulkEmailScopeTypeSeeder');

class BulkEmailScopeTypeSchema extends Schema {
  up() {
    this.schedule(async (transaction) => {
      try {
        await BulkEmailScopeTypeSeeder.run(transaction);
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    });
  }

  down() {
    this.table('bulk_email_scope_types', (table) => {
      // reverse alternations
    });
  }
}

module.exports = BulkEmailScopeTypeSchema;
