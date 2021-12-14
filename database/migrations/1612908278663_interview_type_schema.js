'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

// Seeder
const SendoutInterviewTypeSeeder = require('../Seeds/SendoutInterviewTypeSeeder');

class InterviewTypeSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      try {
        await SendoutInterviewTypeSeeder.run(transaction);
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    });
  }
}

module.exports = InterviewTypeSchema
