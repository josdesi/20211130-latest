'use strict';

/*
|--------------------------------------------------------------------------
| SourceTypeSeeder
|--------------------------------------------------------------------------
|
| Make use of the Factory instance to seed database with dummy data or
| make use of Lucid models directly.
|
*/

/** @type {import('@adonisjs/lucid/src/Factory')} */
const Database = use('Database')
const { CandidateSourceURLTypes } = use('App/Helpers/Globals');
const SourceType = use('App/Models/SourceType');
class SourceTypeSeeder {
  async run (externalTransaction) {
    const transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
    const isAtomic = (!externalTransaction) && transaction;
    try {
      for(const key of Object.keys(CandidateSourceURLTypes)) {
        const { id, title } = CandidateSourceURLTypes[key];
        const currentStatus = await SourceType.find(id);
        if (currentStatus) {
          currentStatus.merge({title});
          await currentStatus.save();
          continue;
        }
        await SourceType.create({
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

module.exports = SourceTypeSeeder;
