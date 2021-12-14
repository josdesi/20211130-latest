'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

const CandidateStatusSeeder = require('../seeds/CandidateStatusSeeder');


class CandidateStatusUpdaterSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      try {
        await CandidateStatusSeeder.run(transaction);
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    });
  }

  down () {
    this.table('candidate_statuses', (table) => {
      // reverse alternations
    })
  }
}

module.exports = CandidateStatusUpdaterSchema
