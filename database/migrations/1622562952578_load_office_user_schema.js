'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const UserSeeder = require('../Seeds/UserSeeder');
const APIUsers = require('../data/APIUsers.json');

class LoadOfficeUserSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      try {
        await UserSeeder.run(transaction, APIUsers);
      } catch (error) {
        await transaction.rollback();
        throw error
      }
    });
  }

  down () {
  }
}

module.exports = LoadOfficeUserSchema
