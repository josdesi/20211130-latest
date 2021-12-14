'use strict'

/*
|--------------------------------------------------------------------------
| RoleSeeder
|--------------------------------------------------------------------------
|
| Make use of the Factory instance to seed database with dummy data or
| make use of Lucid models directly.
|
*/

/** @type {import('@adonisjs/lucid/src/Factory')} */
const Role = use('App/Models/Role');

class RoleSeeder {
  async run () {
    const roles = [
      { id: 1,  title: 'Recruiter' },
      { id: 2,  title: 'Coach' },
      { id: 3,  title: 'Admin' },
      { id: 4,  title: 'Regional Director' },
      { id: 5,  title: 'Production Director' },
      { id: 6,  title: 'Operations' },
      { id: 7,  title: 'Data Coordinator' },
      { id: 8,  title: 'Finance' }

    ]
    for(const role of roles){
      await Role.findOrCreate(role);
    } 
  }
}

module.exports = RoleSeeder
