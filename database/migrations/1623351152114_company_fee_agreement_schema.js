'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database');
class CompanyFeeAgreementSchema extends Schema {
  up () {
    this.table('company_fee_agreements', (table) => {
      table.string('signature_process_type_id', 255).references('id').inTable('fee_agreement_signature_process_types');

    });

    this.schedule(async(transaction) => {
      try {
        await Database.raw(`UPDATE company_fee_agreements SET signature_process_type_id = 'fortPacManaged' WHERE true`).transacting(transaction);
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

module.exports = CompanyFeeAgreementSchema
