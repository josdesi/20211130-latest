'use strict'

/*
|--------------------------------------------------------------------------
| JobOrderSourceTypeSeeder
|--------------------------------------------------------------------------
|
| Make use of the Factory instance to seed database with dummy data or
| make use of Lucid models directly.
|
*/

/** @type {import('@adonisjs/lucid/src/Factory')} */
const Database = use('Database')
const { JobOrderSourceURLTypes } = use('App/Helpers/Globals');
const JobOrderSourceType = use('App/Models/JobOrderSourceType');

class JobOrderSourceTypeSeeder {
  async run (externalTransaction) {
    const transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
    const isAtomic = (!externalTransaction) && transaction;
    try {
      for(const key of Object.keys(JobOrderSourceURLTypes)) {
        const { id, title } = JobOrderSourceURLTypes[key];
        const currentStatus = await JobOrderSourceType.find(id);
        if (currentStatus) {
          currentStatus.merge({title});
          await currentStatus.save();
          continue;
        }
        await JobOrderSourceType.create({
          id,
          title,
        }, transaction);
      }
      isAtomic && (await transaction.commit());
    } catch(error) {
      isAtomic && (await transaction.rollback());
    }
  }
}

module.exports = JobOrderSourceTypeSeeder
