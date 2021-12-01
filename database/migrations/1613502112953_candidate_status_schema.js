'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

// Seeder
const CandidateStatusSeeder = require('../Seeds/CandidateStatusSeeder');

class CandidateStatusSchema extends Schema {
  up () {
    this.table('candidate_statuses', (table) => {
      // alter table
    })

    this.schedule(async (transaction) => {
      try {
        await CandidateStatusSeeder.run(transaction);
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    })
  }

  down () {
    this.table('candidate_statuses', (table) => {
      // reverse alternations
    })
  }
}

module.exports = CandidateStatusSchema
