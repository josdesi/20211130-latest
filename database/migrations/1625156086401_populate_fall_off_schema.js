'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const { placementReasonsToFallOff } = use('App/Utils/PlacementUtils');
class PopulateFallOffSchema extends Schema {
  up () {
    this.table('placement_fall_off_reasons', (table) => {
      this.schedule(async (transaction) => {
        await transaction.table('placement_fall_off_reasons').insert(placementReasonsToFallOff);
      });
    });
  }

  down () {
    this.table('placement_fall_off_reasons', (table) => {
      this.schedule(async (transaction) => {
        await transaction
          .table('placement_fall_off_reasons')
          .whereIn('id', placementReasonsToFallOff.map(val => val.id))
          .delete();
      });
    });
  }
}

module.exports = PopulateFallOffSchema
