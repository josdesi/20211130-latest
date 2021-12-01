'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const FeeAgreementEventTypeSeeder = require('../seeds/FeeAgreementEventTypeSeeder');

class FeeAgreementStatusSchema extends Schema {
  up () {
    this.schedule(async(transaction) => {
      try {
        const feeAgreementEventTypeSeeder = new FeeAgreementEventTypeSeeder();
        await feeAgreementEventTypeSeeder.run(transaction);
        await transaction.commit();
      } catch(error) {
        await transaction.rollback();
        throw error;
      }
    });
  }

  down () {
    this.table('fee_agreement_statuses', (table) => {
      // reverse alternations
    })
  }
}

module.exports = FeeAgreementStatusSchema
