'use strict'

/*
|--------------------------------------------------------------------------
| UserStatusSeeder
|--------------------------------------------------------------------------
|
| Make use of the Factory instance to seed database with dummy data or
| make use of Lucid models directly.
|
*/

/** @type {import('@adonisjs/lucid/src/Factory')} */
const Database = use('Database')

class UserStatusSeeder {
  static async run () {
    const data = [
      { title:'Active' },
      { title:'Inactive' }
    ]
    await Database.table('user_statuses').insert(data)
    await Database.raw("SELECT setval('user_statuses_id_seq',?, true)",[data.length])
  }
}

module.exports = UserStatusSeeder
