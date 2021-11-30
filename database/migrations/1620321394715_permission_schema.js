'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

const PermissionSeeder = require('../seeds/PermissionSeeder');
const Database = use('Database');
const UserHasPermission = use('App/Models/UserHasPermission');
const { userPermissions } = use('App/Helpers/Globals');
const { uniqBy } = use('lodash');

class PermissionsSchema extends Schema {
  up() {
    this.schedule(async (transaction) => {
      try {
        const permissionSeeder = new PermissionSeeder();
        await permissionSeeder.run(transaction);

        const coachEmails = ['abby.deneui@gogpac.com', 'andrew.pulsifer@gogpac.com', 'erika.reiman@gogpac.com'];

        const coachSubquery = Database.table('users').select('id').whereIn('email', coachEmails);

        const recruiterIds = await Database.table('recruiter_has_industries')
          .select('recruiter_id')
          .whereIn('coach_id', coachSubquery);

        const permissionsDataRaw = recruiterIds.map((row) => {
          return { permission_id: userPermissions.bulkEmail.usage, user_id: row.recruiter_id };
        });

        const permissionsData = uniqBy(permissionsDataRaw, 'user_id');

        await UserHasPermission.createMany(permissionsData, transaction);

        await transaction.commit();
      } catch (ex) {
        await transaction.rollback();
        throw ex;
      }
    });
  }
}

module.exports = PermissionsSchema;
