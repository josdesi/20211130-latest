'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class AddAdjustmentSendgridConfigSchema extends Schema {
  up() {
    this.table('sendgrid_configurations', (table) => {
      this.schedule(async (transaction) => {
        await transaction.table('sendgrid_configurations')
          .insert([
            { type: 'PlacementRecruiterAdjustmentEmail', sender: 'notifications@gogpac.com', template_id: 'd-0cf55f2727a04d70af3b15cdcbfaa7e1' },
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
            'd-0cf55f2727a04d70af3b15cdcbfaa7e1'
          ])
          .delete();
      });
    });
  }
}

module.exports = AddAdjustmentSendgridConfigSchema