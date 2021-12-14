'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database');
class CompanyFeeAgreementsSchema extends Schema {
  up () {
    this.table('company_fee_agreements', (table) => {
      table.string('electronic_signature_provider_id')
        .references('id')
        .inTable('electronic_signature_providers');
    })

    this.schedule(async(transaction) => {  
      try {
        await Database.table('electronic_signature_providers').insert([
          {id: 'helloSign', title: 'Hellosign'},
          {id: 'docuSign', title: 'DocuSign'}
        ]).transacting(transaction);
        await transaction.commit();
      } catch(error) {
        await transaction.rollback();
        throw error;
      }
    });
  }

  down () {
    this.table('company_fee_agreements', (table) => {
      // reverse alternations
    })
  }
}

module.exports = CompanyFeeAgreementsSchema
