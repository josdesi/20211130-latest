'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const PlacementStatusSeeder = require('../seeds/PlacementStatusSeeder');
const { placementStatus } = use('App/Utils/PlacementUtils');

class AddValidationRegionalPlacementStatusSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      const placementStatuseSeeder = new PlacementStatusSeeder();
      try {
        await placementStatuseSeeder.run(transaction);
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    });
  }

  down () {
    this.schedule(async (transaction) => {
      await transaction.table('placement_statuses')
        .where('id', placementStatus.Pending_Regional_Validation._id)
        .delete();
    });
  }
}

module.exports = AddValidationRegionalPlacementStatusSchema
