'use strict'

/*
|--------------------------------------------------------------------------
| NameStatusSeeder
|--------------------------------------------------------------------------
|
| Make use of the Factory instance to seed database with dummy data or
| make use of Lucid models directly.
|
*/

/** @type {import('@adonisjs/lucid/src/Factory')} */
const { nameTypes } = use('App/Helpers/Globals');
const Database = use('Database')

class NameStatusSeeder {
  static async run () {
    const data = [
      { id: 0, name_type_id: nameTypes.Name, title: 'Undefined' },
      { id: 1, name_type_id: nameTypes.Name, title: 'Candidate' },
      { id: 2, name_type_id: nameTypes.Name, title: 'Hiring Authority' }
    ]
    await Database.table('name_statuses').insert(data)
    await Database.raw("SELECT setval('name_statuses_id_seq',?, true)",[data.length])
  }
}

module.exports = NameStatusSeeder
