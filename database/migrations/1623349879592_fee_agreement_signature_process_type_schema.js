'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database');
const FeeAgreementSignatureProcessTypeSeeder = require('../seeds/FeeAgreementSignatureProcessTypeSeeder');
class FeeAgreementSignatureProcessTypeSchema extends Schema {
  up () {
    this.create('fee_agreement_signature_process_types', (table) => {
      table.string('id', 30).primary();
      table.string('title', 255);
      table.timestamps()
    })

    this.schedule(async (transaction) => {
      const feeAgreementSignatureProcessTypeSeeder = new FeeAgreementSignatureProcessTypeSeeder();
      try {
        await feeAgreementSignatureProcessTypeSeeder.run(transaction);
        await transaction.commit();
      } catch(error) {
        await transaction.rollback();
        throw error;
      }
    });
  }


  down () {
    this.drop('fee_agreement_signature_process_types')
  }
}

module.exports = FeeAgreementSignatureProcessTypeSchema
