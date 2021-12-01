'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

// Seeder
const TeamSeeder = require('../Seeds/TeamSeeder');

class TeamSchema extends Schema {
  up () {
    this.schedule(async (trx) => {
      try {
        await TeamSeeder.run(trx);
        await trx.commit();
      } catch (error) {
        await trx.rollback();
        throw error;
      }
    });
  }

  down () {
  }
}

module.exports = TeamSchema
