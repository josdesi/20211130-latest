'use strict'

/*
|--------------------------------------------------------------------------
| PermissionSeeder
|--------------------------------------------------------------------------
|
| Make use of the Factory instance to seed database with dummy data or
| make use of Lucid models directly.
|
*/

/** @type {import('@adonisjs/lucid/src/Factory')} */
const Permission = use('App/Models/Permission');
const Database = use('Database');

class PermissionSeeder {
  async run (externalTransaction) {
    const transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
    try {
      const permissions = [
        {id: 1, title: 'feeAgreements.modifyGuarantee'},
        {id: 2, title: 'feeAgreements.modifyPercentage'},
        {id: 3, title: 'newFeeAgreements.usage'},
        {id: 4, title: 'newFeeAgreements.manageTemplates'},
        {id: 5, title: 'modulePresetConfigs.manage'},
        {id: 6, title: 'moduleContacts.usage'},
        {id: 7, title: 'mobileApplication.usage'},
        {id: 8, title: 'inventory.overrideAssignment'},
        {id: 9, title: 'verificationModals.usage'},
        {id: 10, title: 'placements.usage'},
        {id: 11, title: 'sendout.usage'},
        {id: 12, title: 'bulkEmail.usage'},
        {id: 13, title: 'placements.overrideApproval'},
        {id: 14, title: 'ringCentral.usage'},
        {id: 15, title: 'ringCentral.glip'}
      ];
      for(const permission of permissions) {
        const exists = await Permission.find(permission.id);
        if (exists) {
          continue;
        }
        await Permission.create(permission, transaction);
      }
      (!externalTransaction) && (await transaction.commit());
    } catch(error) {  
      (!externalTransaction) && (await transaction.rollback());
      throw error;
    }
  }
}

module.exports = PermissionSeeder
