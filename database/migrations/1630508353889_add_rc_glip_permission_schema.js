'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const PermissionSeeder = require('../seeds/PermissionSeeder');
const { userPermissions } = use('App/Helpers/Globals');

class AddRcGlipPermissionSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      const permissionSeeder = new PermissionSeeder();
      try {
        await permissionSeeder.run(transaction);
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    });
  }

  down () {
    this.schedule(async (transaction) => {
      await transaction.table('permissions')
        .where('id', userPermissions.ringCentral.glip)
        .delete();
    });
  }
}

module.exports = AddRcGlipPermissionSchema
