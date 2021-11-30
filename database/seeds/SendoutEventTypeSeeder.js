'use strict';

/*
|--------------------------------------------------------------------------
| SendoutEventTypeSeeder
|--------------------------------------------------------------------------
|
| Make use of the Factory instance to seed database with dummy data or
| make use of Lucid models directly.
|
*/

/** @type {import('@adonisjs/lucid/src/Factory')} */
const Database = use('Database')

// Models
const SendoutEventType = use('App/Models/SendoutEventType');

class SendoutEventTypeSeeder {
  async run (externalTransaction) {
    const transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
    const isAtomic = (!externalTransaction) && transaction;
    const eventTypes = require('../data/SendoutEventType.json');

    try {
      for(const type of eventTypes) {
        const currentEventType = await SendoutEventType.find(type.id);

        if (currentEventType) {
          // currentEventType.merge(type);
          // await currentEventType.save();
          continue;
        }
        await SendoutEventType.create(type, transaction);
      }
      isAtomic && (await transaction.commit());
    } catch(error) {
      isAtomic && (await transaction.rollback());
    }
  }
}

module.exports = SendoutEventTypeSeeder;
