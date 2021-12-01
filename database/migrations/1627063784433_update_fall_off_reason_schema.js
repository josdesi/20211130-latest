'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const PlacementFallOffReasonSeeder = require('../seeds/PlacementFallOffReasonSeeder');


class UpdateFallOffReasonSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      const fallOffSeeder = new PlacementFallOffReasonSeeder();
      try {
        await fallOffSeeder.run(transaction);
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    });
  }

  down () {
    // reverse alternations
  }
}

module.exports = UpdateFallOffReasonSchema
