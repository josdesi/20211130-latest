'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const FeeAgreementPaymentSchemesSeeder = require('../seeds/FeeAgreementPaymentSchemesSeeder');
class FeeAgreementPaymentSchemesSchema extends Schema {
  up () {
    this.table('fee_agreement_payment_schemes', (table) => {
      // alter table
    })

    this.schedule(async(transaction) => {
      try {
        const feeAgreementPaymentSchemesSeeder = new FeeAgreementPaymentSchemesSeeder();
        await feeAgreementPaymentSchemesSeeder.run(transaction);
      } catch(error) {
        console.log('error here');
        await transaction.rollback();
        throw error;
      }
    });
  }

  down () {
    this.table('fee_agreement_payment_schemes', (table) => {
      // reverse alternations
    })
  }
}

module.exports = FeeAgreementPaymentSchemesSchema
