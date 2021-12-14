'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const FeeAgreementStatusSeeder = require('../seeds/FeeAgreementStatusSeeder');
class FeeAgreementEventTypesSchema extends Schema {
  up () {
    this.table('fee_agreement_event_types', (table) => {
      // alter table
    })

    this.schedule(async (transaction) => {
      try {
        const feeAgreementStatusSeeder = new FeeAgreementStatusSeeder();
        await feeAgreementStatusSeeder.run(transaction);
        await transaction.commit();
      } catch(error) {
        await transaction.rollback();
        throw error;
      }
    });
  }

  down () {
    this.table('fee_agreement_event_types', (table) => {
      // reverse alternations
    })
  }
}

module.exports = FeeAgreementEventTypesSchema
