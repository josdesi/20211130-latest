'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const  FeeAgreementCatalogsSeeder = require('../seeds/FeeAgreementCatalogsSeeder');
class FeeAgreementStatusesSchema extends Schema {
  up () {
    this.table('fee_agreement_statuses', (table) => {
      
    })

    this.schedule(async (transaction) => {
      try {
        const feeAgreementCatalogsSeeder = new FeeAgreementCatalogsSeeder();
        await feeAgreementCatalogsSeeder.run(transaction);
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

module.exports = FeeAgreementStatusesSchema
