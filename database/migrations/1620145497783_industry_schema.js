'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

// Seeder
const IndustryEmailsSeeder = require('../Seeds/IndustryEmailsSeeder');

class IndustrySchema extends Schema {
  up () {
    this.schedule(async (trx) => {
      try {
        await IndustryEmailsSeeder.run(trx);
        await trx.commit();
      } catch (error) {
        await trx.rollback();
        throw error;
      }
    });
  }

  down () {
    this.table('industries', (table) => {
      // reverse alternations
    })
  }
}

module.exports = IndustrySchema
