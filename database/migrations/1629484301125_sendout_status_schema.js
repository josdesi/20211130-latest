'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

const SendoutStatusSeeder = require('../Seeds/SendoutStatusSeeder');

class SendoutStatusSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      try {
        await SendoutStatusSeeder.run(transaction);
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

module.exports = SendoutStatusSchema
