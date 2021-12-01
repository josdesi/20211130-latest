'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const PlacementStatusSeeder = require('../seeds/PlacementStatusSeeder');

class UpdatePlacementStatusSchema extends Schema {
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

  }
}

module.exports = UpdatePlacementStatusSchema
