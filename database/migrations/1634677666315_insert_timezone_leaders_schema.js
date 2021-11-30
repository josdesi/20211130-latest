'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');
const Database = use('Database');

class InsertTimezoneLeadersSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      try {
        await Database.table('users')
          .transacting(transaction)
          .update({ timezone: 'US Central Time' });

        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    });
  }

  down () {}
}

module.exports = InsertTimezoneLeadersSchema
