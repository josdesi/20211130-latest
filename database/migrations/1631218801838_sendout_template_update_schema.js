'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

const SendoutTemplateSeeder = require('../Seeds/SendoutTemplateSeeder');

class SendoutTemplateUpdateSchema extends Schema {
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
    this.table('sendout_template_updates', (table) => {
      // reverse alternations
    })
  }
}

module.exports = SendoutTemplateUpdateSchema
