'use strict'

const { errorMonitor } = require('agenda');

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
const Factory = use('Factory')
const Permission = use('App/Models/Permission');
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
      const users = await User.query().whereIn('email', emailOfUsersThatCanModifyPresetConfigs).fetch();
      const permissionsToAdd = users.rows.map(({id}) => {return {user_id: id, permission_id: 5}});
      const result = await UserHasPermission.createMany(permissionsToAdd, transaction);
      (!externalTransaction) && (await transaction.commit());
    } catch(error) {  
      (!externalTransaction) && (await transaction.rollback());
      throw error;
    }
  }
}

module.exports = ConfigurationPermissionSeeder
