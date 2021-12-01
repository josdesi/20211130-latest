'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class SendgridPlacementEmailsSchema extends Schema {
  up() {
    this.table('sendgrid_configurations', (table) => {
      this.schedule(async (transaction) => {
        await transaction.table('sendgrid_configurations')
          .insert([
            { type: 'PlacementRegionalCoachApproveEmail', sender: 'notifications@gogpac.com', template_id: 'd-ea6ba40bd18d4e9582913579ba2f1db0' },
            { type: 'PlacementRecruiterPaymentEmail', sender: 'notifications@gogpac.com', template_id: 'd-0e305f31d1ad435ebbb73392802a5868' },
            { type: 'PlacementRecruiterInvoiceEmail', sender: 'notifications@gogpac.com', template_id: 'd-599f297dcb504497ade796ba9bebd2c7' },
            { type: 'PlacementRecruiterApproveEmail', sender: 'notifications@gogpac.com', template_id: 'd-b45a0fe573844d128dcd012a0f7fc4de' },
          ]);
      });
    });
  }

  down () {
    this.table('sendgrid_configurations', (table) => {
      this.schedule(async (transaction) => {
        await transaction
          .table('sendgrid_configurations')
          .whereIn('template_id', [
            'd-ea6ba40bd18d4e9582913579ba2f1db0',
            'd-0e305f31d1ad435ebbb73392802a5868',
            'd-599f297dcb504497ade796ba9bebd2c7',
            'd-b45a0fe573844d128dcd012a0f7fc4de'
          ])
          .delete();
      });
    });
  }
}

module.exports = SendgridPlacementEmailsSchema
