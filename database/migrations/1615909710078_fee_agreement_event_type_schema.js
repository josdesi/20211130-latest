'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database');
class FeeAgreementEventTypeSchema extends Schema {
  up () {
    this.table('fee_agreement_event_types', (table) => {
      // alter table
    })

    this.schedule(async (transaction) => {
      try {
        const configuration = {
          type: 'feeAgreementSentRegionalDirectorNotification',
          sender: 'notifications@gogpac.com',
          template_id: 'd-bfad69446158429f9073ba23d3bbbd76'
        };
        await Database.table('sendgrid_configurations').insert(configuration).transacting(transaction);
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

module.exports = FeeAgreementEventTypeSchema
