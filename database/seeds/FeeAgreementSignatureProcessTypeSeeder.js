'use strict'

/*
|--------------------------------------------------------------------------
| FeeAgreementSignatureProcessTypeSeeder
|--------------------------------------------------------------------------
|
| Make use of the Factory instance to seed database with dummy data or
| make use of Lucid models directly.
|
*/

/** @type {import('@adonisjs/lucid/src/Factory')} */
const Factory = use('Factory')
const Database = use('Database')

class FeeAgreementSignatureProcessTypeSeeder {
  async run (transaction) {
    const data = [
      {id: 'fortPacManaged', title: 'Fortpac Managed'},
      {id: 'externalUnmanaged', title: 'External to Fortpac (Unmanaged)'},
    ];
    await Database.table('fee_agreement_signature_process_types').insert(data).transacting(transaction);
  }
}

module.exports = FeeAgreementSignatureProcessTypeSeeder
