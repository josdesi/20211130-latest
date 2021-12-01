'use strict';

/*
|--------------------------------------------------------------------------
| BulkEmailScopeTypeSeeder
|--------------------------------------------------------------------------
|
| Make use of the Factory instance to seed database with dummy data or
| make use of Lucid models directly.
|
*/

/** @type {import('@adonisjs/lucid/src/Factory')} */
const Factory = use('Factory');
const BulkEmailScopeType = use('App/Models/BulkEmailScopeType');
const { BulkEmailScopeTypes } = use('App/Helpers/Globals');

class BulkEmailScopeTypeSeeder {
  static async run(trx) {
    const bulkEmailScopeTypes = [
      {
        id: BulkEmailScopeTypes.Marketing,
        title: 'Marketing',
      },
      {
        id: BulkEmailScopeTypes.Recruiting,
        title: 'Recruiting',
      },
      {
        id: BulkEmailScopeTypes.Global,
        title: 'Global',
      },
    ];

    for (const bulkEmailScopeType of bulkEmailScopeTypes) {
      const exists = await BulkEmailScopeType.query()
        .where('id', bulkEmailScopeType.id)
        .andWhere('title', bulkEmailScopeType.title)
        .first();
      if (exists) continue;

      const idExists = await BulkEmailScopeType.query().where('id', bulkEmailScopeType.id).first();
      if (idExists) {
        await BulkEmailScopeType.query()
          .where('id', bulkEmailScopeType.id)
          .update({ title: bulkEmailScopeType.title }, trx);
        continue;
      }

      await BulkEmailScopeType.create(bulkEmailScopeType, trx);
    }
  }
}

module.exports = BulkEmailScopeTypeSeeder;
