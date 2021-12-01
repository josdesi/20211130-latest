'use strict';

/*
|--------------------------------------------------------------------------
| UnsubscribeReasonSeeder
|--------------------------------------------------------------------------
|
| Make use of the Factory instance to seed database with dummy data or
| make use of Lucid models directly.
|
*/

/** @type {import('@adonisjs/lucid/src/Factory')} */
const UnsubscribeReason = use('App/Models/UnsubscribeReason');
const Database = use('Database');
const { UnsubscribeReasons } = use('App/Helpers/Globals');

class UnsubscribeReasonSeeder {
  //Migration seeder
  static async run(trx) {
    for (const unsubscribeReason of UnsubscribeReasons) {
      const result = await UnsubscribeReason.query()
        .where('id', unsubscribeReason.id)
        .andWhere('description', unsubscribeReason.description)
        .first();

      if (result) continue;

      //Remove the item that is occupying the id that the item will have
      await UnsubscribeReason.query().where('id', unsubscribeReason.id).transacting(trx).delete();

      //Remove any old item that has a old/different id, but same description
      // await UnsubscribeReason.query().where('description', unsubscribeReason.description).transacting(trx).delete();

      await UnsubscribeReason.create(unsubscribeReason, trx);
    }
  }

  //Manual seeding
  async run() {
    const trx = await Database.beginTransaction();
    try {
      for (const unsubscribeReason of UnsubscribeReasons) {
        const result = await UnsubscribeReason.query()
          .where('id', unsubscribeReason.id)
          .andWhere('description', unsubscribeReason.description)
          .first();

        if (result) continue;

        //Remove the item that is occupying the id that the item will have
        await UnsubscribeReason.query().where('id', unsubscribeReason.id).transacting(trx).delete();

        //Remove any old item that has a old/different id, but same description
        // await UnsubscribeReason.query().where('description', unsubscribeReason.description).transacting(trx).delete();

        await UnsubscribeReason.create(unsubscribeReason, trx);
      }
      await trx.commit();
    } catch (error) {
      await trx.rollback();
    }
  }
}

module.exports = UnsubscribeReasonSeeder;
