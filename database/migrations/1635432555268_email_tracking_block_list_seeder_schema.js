'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');
const EmailTrackingBlockListSeeder = new (require('../seeds/EmailTrackingBlockListSeeder'))();

class EmailTrackingBlockListSeederSchema extends Schema {
  up() {
    this.schedule(async (transaction) => {
      await EmailTrackingBlockListSeeder.run(transaction);
    });
  }

  down() {}
}

module.exports = EmailTrackingBlockListSeederSchema;
