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
const FeeAgreementEventType = use('App/Models/FeeAgreementEventType')

class FeeAgreementEventTypeSeeder {
  async run (externalTransaction) {
    const transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
    const isAtomic = (!externalTransaction) && transaction;
    const feeAgreementEventTypes = require('../data/FeeAgreementEventTypes.json');
    try {
      for(const feeAgreementEventType of feeAgreementEventTypes) {
        const currentEventType = await FeeAgreementEventType.find(feeAgreementEventType.id);
        if (currentEventType) {
          currentEventType.merge(feeAgreementEventType);
          await currentEventType.save();
          continue;
        }
        await FeeAgreementEventType.create(feeAgreementEventType, transaction);
      }
      isAtomic && (await transaction.commit());
    } catch(error) {0
      isAtomic && (await transaction.rollback());
    }
  }
}

module.exports = FeeAgreementEventTypeSeeder
