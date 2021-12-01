'use strict'

/*
|--------------------------------------------------------------------------
| FeeAgreementStatusSeeder
|--------------------------------------------------------------------------
|
| Make use of the Factory instance to seed database with dummy data or
| make use of Lucid models directly.
|
*/

/** @type {import('@adonisjs/lucid/src/Factory')} */
const Database = use('Database')
const FeeAgreementStatus = use('App/Models/FeeAgreementStatus')

class FeeAgreementStatusSeeder {
  async run (externalTransaction) {
    const transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
    const isAtomic = (!externalTransaction) && transaction;
    const feeAgreementStatuses = require('../data/FeeAgreementStatuses.json');
    try {
      for(const feeAgreementStatus of feeAgreementStatuses) {
        const currentStatus = await FeeAgreementStatus.find(feeAgreementStatus.id);
        if (currentStatus) {
          currentStatus.merge(feeAgreementStatus);
          await currentStatus.save();
          continue;
        }
        await FeeAgreementStatus.create(feeAgreementStatus, transaction);
      }
      isAtomic && (await transaction.commit());
    } catch(error) {0
      isAtomic && (await transaction.rollback());
    }
  }
}

module.exports = FeeAgreementStatusSeeder
