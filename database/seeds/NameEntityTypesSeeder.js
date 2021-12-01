'use strict'

const { errorMonitor } = require('agenda');

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
const NameEntityType = use('App/Models/NameEntityType');
const Database = use('Database');

class NameEntityTypeSeeder {
  async run (externalTransaction) {
    const transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
    try {
      const nameEntityTypes = require('../data/NameEntityTypes.json');
      for(const nameEntityType of nameEntityTypes) {
        const exists = await NameEntityType.find(nameEntityType.id);
        if (exists) {
          exists.merge(nameEntityType);
          exists.save(transaction);;
        }
        await NameEntityType.create(nameEntityType, transaction);
      }
      (!externalTransaction) && (await transaction.commit());
    } catch(error) {  
      (!externalTransaction) && (await transaction.rollback());
      throw error;
    }
  }
}

module.exports = NameEntityTypeSeeder
