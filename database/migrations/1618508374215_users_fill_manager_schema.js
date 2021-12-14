'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const UserSeeder = require('../Seeds/UserSeeder');

class UsersSchema extends Schema {
  up () {

    // Add manager_id in users
    this.schedule(async (transaction) => {
      try {
        await UserSeeder.addManager(transaction);
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

module.exports = UsersSchema
