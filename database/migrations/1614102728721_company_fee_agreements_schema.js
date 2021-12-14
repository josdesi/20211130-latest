'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const FeeAgreementPaymentSchemesSeeder = require('../seeds/FeeAgreementPaymentSchemesSeeder');
const FeeAgreementEventTypeSeeder = require('../seeds/FeeAgreementEventTypeSeeder');
class CompanyFeeAgreementsSchema extends Schema {
  up () {
    this.table('company_fee_agreements', (table) => {
      
    })

    this.schedule(async (transaction) => {
      try {
        const feeAgreementEventTypeSeeder = new FeeAgreementEventTypeSeeder();
        const feeAgreementPaymentSchemesSeeder = new FeeAgreementPaymentSchemesSeeder();
        await feeAgreementPaymentSchemesSeeder.run(transaction);
        await feeAgreementEventTypeSeeder.run(transaction);
        await transaction.commit();
      } catch(error) {
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
