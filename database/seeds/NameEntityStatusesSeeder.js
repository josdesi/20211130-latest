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
const NameStatus = use('App/Models/NameStatus');
const Database = use('Database');

class NameEntityStatusesSeeder {
  async run (externalTransaction) {
    const transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
    try {
      const nameStatuses = require('../data/NameEntityStatuses.json');
      for(const nameStatus of nameStatuses) {
        const exists = await NameStatus.find(nameStatus.id);
        if (exists) {
          continue;
        }
        await NameStatus.create(nameStatus, transaction);
      }
      (!externalTransaction) && (await transaction.commit());
    } catch(error) {  
      (!externalTransaction) && (await transaction.rollback());
      throw error;
    }
  }
}

module.exports = NameEntityStatusesSeeder
