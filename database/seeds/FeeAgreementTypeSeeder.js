'use strict'

/*
|--------------------------------------------------------------------------
| FeeAgreementTypeSeeder
|--------------------------------------------------------------------------
|
| Make use of the Factory instance to seed database with dummy data or
| make use of Lucid models directly.
|
*/

/** @type {import('@adonisjs/lucid/src/Factory')} */
const Database = use('Database')

class FeeAgreementTypeSeeder {
  static async run() {
    const data = [
      { id: 0, title: 'Contingency' },
      { id: 1, title: 'Retained' },
    ];
    await Database.table('fee_agreement_types').insert(data)
    await Database.raw("SELECT setval('fee_agreement_types_id_seq',?, true)",[data.length])
  }
}

module.exports = FeeAgreementTypeSeeder
