'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database')
class FeeAgreementEventTypesSchema extends Schema {
  up () {
    this.table('fee_agreement_event_types', (table) => {
      // alter table
    })

    this.schedule(async (transaction) => {
      const updateCompanyFeeAgreements = `
      UPDATE
      company_fee_agreements
    SET
      regional_director_id = (SELECT regional_id FROM v_users WHERE coach_id = company_fee_agreements.coach_id  or recruiter_id = company_fee_agreements.creator_id  LIMIT 1)
    where true
      `;
      try {
        await Database.raw(updateCompanyFeeAgreements).transacting(transaction);
        await transaction.commit();
      } catch(error) {
        await transaction.rollback();
        throw error;
      }
    });
  }

  down () {
    this.table('fee_agreement_event_types', (table) => {
      // reverse alternations
    })
  }
}

module.exports = FeeAgreementEventTypesSchema
