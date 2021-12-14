'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const UserSeeder = require('../Seeds/UserSeeder');

class UserSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      try {
        await UserSeeder.run(transaction);
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error
      }
    });
  }

  down () {
  }
}

module.exports = UserSchema
