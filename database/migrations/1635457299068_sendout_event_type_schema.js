'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');
const SendoutEventType = require('../seeds/SendoutEventTypeSeeder');

class SendoutEventTypeSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      const sendoutEventType = new SendoutEventType();
      try {
        await sendoutEventType.run(transaction);
      } catch(ex) {
        await transaction.rollback();
      }
    });
  }

  down () {
    this.table('sendout_event_types', (table) => {
      // reverse alternations
    })
  }
}

module.exports = SendoutEventTypeSchema
