'use strict'

/*
|--------------------------------------------------------------------------
| FeeAgreementCatalogsSeeder
|--------------------------------------------------------------------------
|
| Make use of the Factory instance to seed database with dummy data or
| make use of Lucid models directly.
|
*/

/** @type {import('@adonisjs/lucid/src/Factory')} */
const Database = use('Database')
const FeeAgreementStatusGroup = use('App/Models/FeeAgreementStatusGroup');
const FeeAgreementStatus = use('App/Models/FeeAgreementStatus');
const FeeAgreementEventType = use('App/Models/FeeAgreementEventType');
class FeeAgreementCatalogsSeeder {
  async run (externalTransaction, catalogs) {
    const transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
    try {

      if(!catalogs || catalogs.includes('groups')) {
        const feeAgreementStatusGroups = require('../data/FeeAgreementStatusGroups.json');
        const feeAgreementStatusGroupsPromises = [];
        for(const feeAgreementStatusGroup of feeAgreementStatusGroups) {
          let promise;
          const existentFeeAgreementStatusGroup = await FeeAgreementStatusGroup.find(feeAgreementStatusGroup.id);
          if (existentFeeAgreementStatusGroup) {
            existentFeeAgreementStatusGroup.merge(feeAgreementStatusGroup);
            promise = existentFeeAgreementStatusGroup.save(transaction);
          } else {
            promise = FeeAgreementStatusGroup.create(feeAgreementStatusGroup, transaction);
          }
          feeAgreementStatusGroupsPromises.push(promise);
        }
        await Promise.all(feeAgreementStatusGroupsPromises);
      }

      if(!catalogs || catalogs.includes('statuses')) {
        const feeAgreementStatuses = require('../data/FeeAgreementStatuses.json');
        const feeAgreementStatusesPromises = [];
        for(const feeAgreementStatus of feeAgreementStatuses) {
          let promise;
          const existentFeeAgreementStatus = await FeeAgreementStatus.find(feeAgreementStatus.id);
          if (existentFeeAgreementStatus) {
            existentFeeAgreementStatus.merge(feeAgreementStatus);
            promise = existentFeeAgreementStatus.save(transaction);
          } else {
            promise = FeeAgreementStatus.create(feeAgreementStatus, transaction);
          }
          feeAgreementStatusesPromises.push(promise);
        }
        await Promise.all(feeAgreementStatusesPromises);
      }
      if(!catalogs || catalogs.includes('eventTypes')) {
        const feeAgreementEventTypes = require('../data/FeeAgreementEventTypes.json');
        const feeAgreementEventTypesPromises = [];
        for(const feeAgreementEventType of feeAgreementEventTypes) {
          let promise;
          const existentFeeAgreementEventType = await FeeAgreementEventType.find(feeAgreementEventType.id);
          if (existentFeeAgreementEventType) {
            existentFeeAgreementEventType.merge(feeAgreementEventType);
            promise = existentFeeAgreementEventType.save(transaction);
          } else {
            promise = FeeAgreementEventType.create(feeAgreementEventType, transaction);
          }
          feeAgreementEventTypesPromises.push(promise);
        }
        await Promise.all(feeAgreementEventTypesPromises);        
      }

      (!externalTransaction) && (await transaction.commit());
    } catch(error) {
      (!externalTransaction) && (await transaction.rollback());
      throw error;
    }

  }
}

module.exports = FeeAgreementCatalogsSeeder
