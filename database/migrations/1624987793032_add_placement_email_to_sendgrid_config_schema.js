'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class AddPlacementEmailToSendgridConfigSchema extends Schema {
  up() {
    this.table('sendgrid_configurations', (table) => {
      this.schedule(async (transaction) => {
        await transaction.table('sendgrid_configurations')
          .insert([
            { type: 'PlacementCoachCreationEmail', sender: 'notifications@gogpac.com', template_id: 'd-9a93c80739184c748ef172f24bcaf44a' },
            { type: 'PlacementRecruiterRequestedUpdateEmail', sender: 'notifications@gogpac.com', template_id: 'd-2a3084e484614d84be80afdab0002fee' },
            { type: 'PlacementFinanceApprovedCoachEmail', sender: 'notifications@gogpac.com', template_id: 'd-7d1b9cc4eace4e28afd67c3cd9147acd' },
            { type: 'PlacementCoachUpdatedRequestEmail', sender: 'notifications@gogpac.com', template_id: 'd-e4e5919d3aa640408f6fedb07463226f' },
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
            'd-9a93c80739184c748ef172f24bcaf44a',
            'd-2a3084e484614d84be80afdab0002fee',
            'd-7d1b9cc4eace4e28afd67c3cd9147acd',
            'd-e4e5919d3aa640408f6fedb07463226f',
          ])
          .delete();
      });
    });
  }
}

module.exports = AddPlacementEmailToSendgridConfigSchema
