'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const FeeAgreementCatalogsSeeder = require('../seeds/FeeAgreementCatalogsSeeder');
class FeeAgreementEventLogsSchema extends Schema {
  up () {
    this.table('fee_agreement_event_logs', (table) => {
      // alter table
    })

    this.schedule(async (transaction) => {
      try {
        
        const feeAgreementCatalogsSeeder = new FeeAgreementCatalogsSeeder();
        await feeAgreementCatalogsSeeder.run(transaction);
        await transaction.commit();
        console.log('it ends');
      } catch(ex) {
        console.log(ex);
      }
    });
  }

  down () {
    this.table('fee_agreement_event_logs', (table) => {
      // reverse alternations
    })
  }
}

module.exports = FeeAgreementEventLogsSchema
