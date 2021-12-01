'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const FeeAgreementCatalogsSeeder = require('../seeds/FeeAgreementCatalogsSeeder');
const PermissionSeeder = require('../seeds/PermissionSeeder'); 
const ConfigurationPermissionSeeder = require('../seeds/ConfigurationPermissionSeeder'); 
const TestNewFeeAgreementPermissionSeeder = require('../seeds/TestNewFeeAgreementPermissionSeeder');
class CompanyFeeAgreementsSchema extends Schema {
  up () {
    this.table('company_fee_agreements', (table) => {
      
    })
    this.schedule(async (transaction) => {
      try {
        const feeAgreementCatalogSeeder = new FeeAgreementCatalogsSeeder();
        const permissionSeeder = new PermissionSeeder();
        const configurationPermissionSeeder = new ConfigurationPermissionSeeder();
        const testNewFeeAgreementPermissionSeeder = new TestNewFeeAgreementPermissionSeeder();
        await feeAgreementCatalogSeeder.run(transaction);
        await permissionSeeder.run(transaction);
        await configurationPermissionSeeder.run(transaction);
        await testNewFeeAgreementPermissionSeeder.run(transaction);
        await transaction.commit();
      } catch(error) {
        await transaction.rollback();
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
