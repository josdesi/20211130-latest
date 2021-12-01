'use strict'

const PermissionSeeder = require('../seeds/PermissionSeeder');

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
class PermissionsSchema extends Schema {
  up () {
    this.table('permissions', (table) => {
      
    })

    this.schedule(async (transaction) => {
      try {
        const permissionSeeder = new PermissionSeeder();
        await permissionSeeder.run(transaction);
        await transaction.commit();
      } catch(ex) {
        await transaction.rollback();
        throw ex;
      }
    });
  }

  down () {
    this.table('permissions', (table) => {
      // reverse alternations
    })
  }
}

module.exports = PermissionsSchema
