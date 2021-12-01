'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const AddressSeeder = require('../Seeds/AddressSeeder');

class AddressSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      try {
        await AddressSeeder.run(transaction);
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error
      }
    });
  }

  down(){

  }
}

module.exports = AddressSchema
