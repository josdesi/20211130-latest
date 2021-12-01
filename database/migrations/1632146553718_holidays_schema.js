'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

const HolidaySeeder = require('../seeds/HolidaySeeder');

class HolidaysSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      try {
        await HolidaySeeder.run(transaction);
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    });
  }

  down () {
    this.table('holidays', (table) => {
      // reverse alternations
    })
  }
}

module.exports = HolidaysSchema
