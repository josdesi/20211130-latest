'use strict';

/*
|--------------------------------------------------------------------------
| UnsubscribeReasonTypeSeeder
|--------------------------------------------------------------------------
|
| Make use of the Factory instance to seed database with dummy data or
| make use of Lucid models directly.
|
*/

/** @type {import('@adonisjs/lucid/src/Factory')} */
const Factory = use('Factory');
const UnsubscribeReasonType = use('App/Models/UnsubscribeReasonType');
const Database = use('Database');
const { UnsubscribeReasonTypes } = use('App/Helpers/Globals');

class UnsubscribeReasonTypeSeeder {
  static async run(trx) {
    const keys = Object.keys(UnsubscribeReasonTypes);
    const unsubscribeReasonTypes = keys.map((key) => UnsubscribeReasonTypes[key]);

    for (const unsubscribeReasonType of unsubscribeReasonTypes) {
      const result = await UnsubscribeReasonType.query()
        .where('id', unsubscribeReasonType.id)
        .andWhere('title', unsubscribeReasonType.title)
        .first();

      if (result) continue;

      //Remove the item that is occupying the id that the item will have
      await UnsubscribeReasonType.query().where('id', unsubscribeReasonType.id).transacting(trx).delete();

      //Remove any old item that has a old/different id, but same title
      await UnsubscribeReasonType.query().where('title', unsubscribeReasonType.title).transacting(trx).delete();

      await UnsubscribeReasonType.create(unsubscribeReasonType, trx);
    }
  }
}

module.exports = UnsubscribeReasonTypeSeeder;
