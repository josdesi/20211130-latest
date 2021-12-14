'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const FeeAgreementStatusSeeder = require('../seeds/FeeAgreementStatusSeeder');
const FeeAgreementEventTypeSeeder = require('../seeds/FeeAgreementEventTypeSeeder');
class FeeAgreementStatusGroupsSchema extends Schema {
  up () {
    this.table('fee_agreement_status_groups', (table) => {
      // alter table
    })
    this.schedule(async (transaction) => {
      const feeAgreementStatusSeeder = new FeeAgreementStatusSeeder();
      const feeAgreementEventTypeSeeder = new FeeAgreementEventTypeSeeder();
      try {
        await feeAgreementStatusSeeder.run(transaction);
        await feeAgreementEventTypeSeeder.run(transaction);
      } catch(ex) {
        await transaction.rollback();
      }
    });
  }

  down () {
    this.table('fee_agreement_status_groups', (table) => {
      // reverse alternations
    })
  }
}

module.exports = FeeAgreementStatusGroupsSchema
