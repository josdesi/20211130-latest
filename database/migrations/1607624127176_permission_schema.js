'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const PermissionSeeder = require('../Seeds/PermissionSeeder');

class PermissionSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      try {
        await PermissionSeeder.run(transaction);
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error
      }
    });
  }

  down () {
    this.table('permissions', (table) => {
      // reverse alternations
    })
  }
}

module.exports = PermissionSchema
