'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

// Seeder
const JobOrderStatusSeeder = require('../Seeds/JobOrderStatusSeeder');

class JobOrderStatusSchema extends Schema {
  up () {
    this.table('job_order_statuses', (table) => {
      // alter table
    })

    this.schedule(async (transaction) => {
      try {
        await JobOrderStatusSeeder.run(transaction);
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    })
  }

  down () {
    this.table('job_order_statuses', (table) => {
      // reverse alternations
    })
  }
}

module.exports = JobOrderStatusSchema
