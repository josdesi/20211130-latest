'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const TestNewFeeAgreementPermissionSeeder = require('../seeds/TestNewFeeAgreementPermissionSeeder');
class CompanyFeeAgreementsSchema extends Schema {
  up () {
    this.table('company_fee_agreements', (table) => {
      // alter table
    })
    this.schedule(async (transaction) => {
      try {
        const testNewFeeAgreementPermissionSeeder = new TestNewFeeAgreementPermissionSeeder()
        await testNewFeeAgreementPermissionSeeder.run(transaction); 
      } catch(error) {
        console.log(error);
      }
    });
  }

  down () {
    this.table('company_fee_agreements', (table) => {
      

    })
  }
}

module.exports = CompanyFeeAgreementsSchema
