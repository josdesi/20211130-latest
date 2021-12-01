'use strict'

/*
|--------------------------------------------------------------------------
| PermissionSeeder
|--------------------------------------------------------------------------
|
| Make use of the Factory instance to seed database with dummy data or
| make use of Lucid models directly.
|
*/

/** @type {import('@adonisjs/lucid/src/Factory')} */
const UserHasPermission = use('App/Models/UserHasPermission');
const User = use('App/Models/User');
const Database = use('Database');

class ConfigurationPermissionSeeder {
  async run (externalTransaction) {
    const transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
    try {
      const emailOfUsersThatCanModifyPresetConfigs = [
        'isidro.vasquez@gogpac.com',
        'roberto.deanda@gogpac.com',
        'mario.moreno@gogpac.com',
        'kevin.velazquez@gogpac.com',
        'emilio.leon@gogpac.com'
      ];
      await User.query().whereIn('email', emailOfUsersThatCanModifyPresetConfigs).fetch();
      const permissionsToAdd = users.rows.map(({id}) => {return {user_id: id, permission_id: 5}});
      await UserHasPermission.createMany(permissionsToAdd, transaction);
      (!externalTransaction) && (await transaction.commit());
    } catch(error) {  
      (!externalTransaction) && (await transaction.rollback());
      throw error;
    }
  }
}

module.exports = ConfigurationPermissionSeeder
