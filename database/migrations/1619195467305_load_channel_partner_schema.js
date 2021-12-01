'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const UserSeeder = require('../Seeds/UserSeeder');

class LoadChannelPartnerSchema extends Schema {
  up () {
    this.raw('CREATE UNIQUE INDEX referee_idx ON channel_partners (referee_id);')
    this.schedule(async (transaction) => {
      try {
        await UserSeeder.addChannelPartner(transaction);
      } catch (error) {
        await transaction.rollback();
        throw error
      }
    });
  }

  down () {
    this.raw('DROP INDEX referee_idx;')
  }
}

module.exports = LoadChannelPartnerSchema
