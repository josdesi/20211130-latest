'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const JobOrderSourceTypeSeeder = require('../seeds/JobOrderSourceTypeSeeder');

class PopulateJobSourceTypeSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      const jobSourceSeeder = new JobOrderSourceTypeSeeder();
      try {
        await jobSourceSeeder.run(transaction);
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

module.exports = PopulateJobSourceTypeSchema
