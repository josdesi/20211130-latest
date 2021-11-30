'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');
const FeeAgreementEventTypeSeeder = require('../seeds/FeeAgreementEventTypeSeeder');
class CompanyFeeAgreementsSchema extends Schema {
  up () {
    this.table('company_fee_agreements', (table) => {
      table.integer('regional_director_id').references('id').on('users');
    })

    this.schedule(async (transaction) => {
      const feeAgreementEventTypeSeeder = new FeeAgreementEventTypeSeeder();
      try {
        await feeAgreementEventTypeSeeder.run(transaction);
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    });
  }

  down () {
    this.table('company_fee_agreements', (table) => {
      // reverse alternations
    })
  }
}

module.exports = CompanyFeeAgreementsSchema
