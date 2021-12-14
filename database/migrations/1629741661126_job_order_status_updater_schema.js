'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

const JobOrderStatusSeeder = require('../seeds/JobOrderStatusSeeder');


class JobOrderStatusSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      try {
        await JobOrderStatusSeeder.run(transaction);
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

module.exports = JobOrderStatusSchema
