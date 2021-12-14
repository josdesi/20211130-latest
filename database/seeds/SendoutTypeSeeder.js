'use strict'

/*
|--------------------------------------------------------------------------
| SendoutTypeSeeder
|--------------------------------------------------------------------------
|
| Make use of the Factory instance to seed database with dummy data or
| make use of Lucid models directly.
|
*/

/** @type {import('@adonisjs/lucid/src/Factory')} */
const Factory = use('Factory')
const Database = use('Database');
const { SendoutTypesSchemes } = use('App/Helpers/Globals');

class SendoutTypeSeeder {
  static async run(trx) {
    const data = [
      { id: SendoutTypesSchemes.Sendout, title: 'Sendout'},
      { id: SendoutTypesSchemes.Sendover, title: 'Sendover'}
    ];

    await Database.table('sendout_types').where('id', '>=', 0).transacting(trx).delete()
    await Database.table('sendout_types').insert(data).transacting(trx)
  }
}

module.exports = SendoutTypeSeeder
