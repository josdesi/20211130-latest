'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const NameEntityStatusesSeeder = require('../seeds/NameEntityStatusesSeeder');
const NameEntityTypesSeeder = require('../seeds/NameEntityTypesSeeder');
class NameEntityTypesSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      try {
        const nameEntityTypeSeeder = new NameEntityTypesSeeder();
        const nameEntityStatusesSeeder = new NameEntityStatusesSeeder();

        await nameEntityTypeSeeder.run(transaction);
        await nameEntityStatusesSeeder.run(transaction);
        await transaction.commit();
      } catch(error) {
        await transaction.rollback();
        throw error;
      }
    });
  }

  down () {
    this.table('name_entity_types', (table) => {
      // reverse alternations
    })
  }
}

module.exports = NameEntityTypesSchema
