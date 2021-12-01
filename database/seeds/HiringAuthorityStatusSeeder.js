'use strict'

/*
|--------------------------------------------------------------------------
| HiringAuthorityStatusSeeder
|--------------------------------------------------------------------------
|
| Make use of the Factory instance to seed database with dummy data or
| make use of Lucid models directly.
|
*/

/** @type {import('@adonisjs/lucid/src/Factory')} */
const Database = use('Database')
const HiringAuthorityStatus = use('App/Models/HiringAuthorityStatus')

class HiringAuthorityStatusSeeder {
  async run () {
    const hiringAuthorityStatuses = [
      {id: 0, title: 'Inactive'},
      {id: 1, title: 'Active'}
    ];
    const transaction = await Database.beginTransaction();
    try {
      for(const hiringAuthorityStatus of hiringAuthorityStatuses) {
        const exists = await HiringAuthorityStatus.find(hiringAuthorityStatus.id);
        if (!exists) {
          await HiringAuthorityStatus.create(hiringAuthorityStatus, transaction);
        }
      }
      await transaction.commit();
    } catch(error) {
      await transaction.rollback();
    }
  }
}

module.exports = HiringAuthorityStatusSeeder
