'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database');
class FeeAgreementStatusesSchema extends Schema {
  up () {
    this.table('fee_agreement_statuses', (table) => {
      // alter table
    })

    this.schedule(async (transaction) => {
      try {
        const createPositionsIndex = 'create unique index v_positions_id_unique on v_positions (id)';
        const createSpecialtiesIndex = 'create unique index v_subspecialties_id_unique on v_subspecialties (id)';

        await Database.raw(createPositionsIndex).transacting(transaction);
        await Database.raw(createSpecialtiesIndex).transacting(transaction);
      } catch(error) {
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
