'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class CompanyFeeAgreementsSchema extends Schema {
  up () {
    this.create('company_fee_agreements', (table) => {
      table.increments()

      table.integer('fee_agreement_status_id')
        .references('id')
        .inTable('fee_agreement_statuses');
      
      table.integer('company_id')
        .references('id')
        .inTable('companies');
      
      table.integer('hiring_authority_id')
        .references('id')
        .inTable('hiring_authorities');
      

      table.integer('creator_id')
        .references('id')
        .inTable('users');

      table.integer('coach_id')
        .references('id')
        .inTable('users');
      
      table.integer('current_declinator_id')
        .references('id')
        .inTable('users');

      table.integer('production_director_signer_id')
        .references('id')
        .inTable('users');
      
      table.integer('operations_validator_id')
        .references('id')
        .inTable('users');
      
      table.float('fee_percentage');
      table.integer('guarantee_days');
      table.timestamp('signed_date');
      table.text('notes');
      table.string('template_id');

      table.boolean('verbiage_changes_requested');
      table.boolean('fee_percentage_change_requested');
      table.boolean('guarantee_days_change_requested');

      table.jsonb('declination_details');
      table.jsonb('cc_emails');
      table.text('verbiage_changes');
      table.string('contract_id', 80);
      table.string('current_responsible', 255);
      table.string('pdf_url', 512);
      table.string('sign_url', 512);
      table.timestamp('validated_date');
      table.timestamp('hiring_authority_sign_date');
      table.timestamp('production_director_signed_date');

      table.timestamps()
    })
  }

  down () {
    this.drop('company_fee_agreements')
  }
}

module.exports = CompanyFeeAgreementsSchema
