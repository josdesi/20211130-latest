'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

// Seeder
const SendoutTemplateSeeder = require('../Seeds/SendoutTemplateSeeder');

class SendoutTemplateSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      try {
        await SendoutTemplateSeeder.run(transaction);
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    });
  }

  down () {
    this.table('sendout_templates', (table) => {
      // reverse alternations
    })
  }
}

module.exports = SendoutTemplateSchema
