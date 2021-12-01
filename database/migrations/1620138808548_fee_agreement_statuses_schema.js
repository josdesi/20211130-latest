'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database');
class FeeAgreementStatusesSchema extends Schema {
  up () {
    this.schedule(async(transaction) => {
      await Database.table('sendgrid_configurations').insert(
        {
          type: 'feeAgreementThankEmail',
          sender: 'jason@gogpac.com',
          template_id: 'd-effb3dfe13d64a8db2ea8b039d11cd0e',
          sender_name: 'Jason Lawrenson'
        }).transacting(transaction);

    });
  }

  down () {
    this.table('fee_agreement_statuses', (table) => {
      // reverse alternations
    })
  }
}

module.exports = FeeAgreementStatusesSchema
