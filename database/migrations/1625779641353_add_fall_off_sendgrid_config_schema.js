'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class AddFallOffSendgridConfigSchema extends Schema {
  up() {
    this.table('sendgrid_configurations', (table) => {
      this.schedule(async (transaction) => {
        await transaction.table('sendgrid_configurations')
          .insert([
            { type: 'PlacementCoachFallOffEmail', sender: 'notifications@gogpac.com', template_id: 'd-584fd2f6d49142dea05484d5482886bc' },
            { type: 'PlacementRecruiterFallOffEmail', sender: 'notifications@gogpac.com', template_id: 'd-112264afc87340b1a518bf082d419b04' },
            { type: 'PlacementCoachRevertFallOffEmail', sender: 'notifications@gogpac.com', template_id: 'd-a3c7e4ce7e29479393105cde1caabe5f' },
            { type: 'PlacementRecruiterRevertFallOffEmail', sender: 'notifications@gogpac.com', template_id: 'd-e1b4061e96e843168e81f62b2dbb36b6' },
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
            'd-584fd2f6d49142dea05484d5482886bc',
            'd-112264afc87340b1a518bf082d419b04',
            'd-a3c7e4ce7e29479393105cde1caabe5f',
            'd-e1b4061e96e843168e81f62b2dbb36b6',
          ])
          .delete();
      });
    });
  }
}

module.exports = AddFallOffSendgridConfigSchema
