'use strict'

/*
|--------------------------------------------------------------------------
| StateSeeder
|--------------------------------------------------------------------------
|
| Make use of the Factory instance to seed database with dummy data or
| make use of Lucid models directly.
|
*/

/** @type {import('@adonisjs/lucid/src/Factory')} */
const Database = use('Database')
const FeeAgreementPaymentScheme = use('App/Models/FeeAgreementPaymentScheme');
class FeeAgreementPaymentSchemesSeeder {
  async run (externalTransaction) {
    const transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
    const feeAgreementPaymentSchemes  = [
      {id: 'standard', title: 'Standard'},
      {id: 'flat', title: 'Flat'},
      {id: 'conversion', title: 'Conversion'},
      {id: 'basesalary', title: 'Base Salary'}
    ];
    try {
      const creationPromises = feeAgreementPaymentSchemes.map(fap => this.createOrUpdate(fap, transaction));
      await Promise.all(creationPromises);
      (!externalTransaction && transaction) && (await transaction.commit());
    } catch(error) {
      (!externalTransaction && transaction) && (await transaction.rollback()); 
      throw error;
    }
  }

  async createOrUpdate(feeAgreementPaymentSchema, transaction) {
    const existentFeeAgreementPaymentSchema = await FeeAgreementPaymentScheme.find(feeAgreementPaymentSchema.id);
    if (existentFeeAgreementPaymentSchema) {
      existentFeeAgreementPaymentSchema.merge(feeAgreementPaymentSchema);
      return existentFeeAgreementPaymentSchema.save(transaction);
    }
    return FeeAgreementPaymentScheme.create(feeAgreementPaymentSchema, transaction) 
  }
}

module.exports = FeeAgreementPaymentSchemesSeeder
