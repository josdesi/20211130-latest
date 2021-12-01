'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database');
class FeeAgreementStatusesSchema extends Schema {
  up () {
    this.schedule(async(transaction) => {
      try {
        await Database.table('company_fee_agreements')
          .update({electronic_signature_provider_id: 'helloSign'})
          .whereRaw('contract_id is not null')
          .transacting(transaction);
        await transaction.commit();
      } catch(error) {
        await transaction.rollback();
        throw error;
      }
    });
  }

  down () {
    this.table('fee_agreement_statuses', (table) => {
      // reverse alternations
    })
  }
}

module.exports = FeeAgreementStatusesSchema
