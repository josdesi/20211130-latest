'use strict'

/*
|--------------------------------------------------------------------------
| PlacementStatusSeeder
|--------------------------------------------------------------------------
|
| Make use of the Factory instance to seed database with dummy data or
| make use of Lucid models directly.
|
*/

/** @type {import('@adonisjs/lucid/src/Factory')} */
const Database = use('Database')
const PlacementStatus = use('App/Models/PlacementStatus');
const { placementStatus } = use('App/Utils/PlacementUtils');

class PlacementStatusSeeder {
  async run (externalTransaction) {
    const transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
    const isAtomic = (!externalTransaction) && transaction;
    try {
      for(const key of Object.keys(placementStatus)) {
        const { _id, _title, _style } = placementStatus[key];
        const currentStatus = await PlacementStatus.find(_id);
        if (currentStatus) {
          currentStatus.merge({
            title: _title,
            style: _style
          });
          await currentStatus.save();
          continue;
        }
        await PlacementStatus.create({
          id: _id,
          title: _title,
          style: _style
        }, transaction);
      }
      isAtomic && (await transaction.commit());
    } catch(error) {
      isAtomic && (await transaction.rollback());
    }
  }
}

module.exports = PlacementStatusSeeder
