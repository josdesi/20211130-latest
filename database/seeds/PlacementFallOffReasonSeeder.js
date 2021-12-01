'use strict'

/*
|--------------------------------------------------------------------------
| PlacementFallOffReasonSeeder
|--------------------------------------------------------------------------
|
| Make use of the Factory instance to seed database with dummy data or
| make use of Lucid models directly.
|
*/

/** @type {import('@adonisjs/lucid/src/Factory')} */
const Database = use('Database')
const PlacementFallOffReason = use('App/Models/PlacementFallOffReason');
const { placementReasonsToFallOff } = use('App/Utils/PlacementUtils');


class PlacementFallOffReasonSeeder {
  async run (externalTransaction) {
    const transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
    const isAtomic = (!externalTransaction) && transaction;
    try {
      for(const object of placementReasonsToFallOff) {
        const { id, title, order } = object;
        const currentReason = await PlacementFallOffReason.find(id);
        if (currentReason) {
          currentReason.merge({
            title,
            order
          });
          await currentReason.save();
          continue;
        }
        await PlacementFallOffReason.create({
          id,
          title,
          order
        }, transaction);
      }
      isAtomic && (await transaction.commit());
    } catch(error) {
      isAtomic && (await transaction.rollback());
    }
  }
}

module.exports = PlacementFallOffReasonSeeder
