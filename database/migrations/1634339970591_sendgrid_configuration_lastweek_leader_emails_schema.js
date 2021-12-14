'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class SendgridConfigurationLastWeeksLeaderEmailsSchema extends Schema {
  up () {
    this.table('sendgrid_configurations', (table) => {
      this.schedule(async (transaction) => {
        await transaction.table('sendgrid_configurations')
          .insert([
            { type: 'LastWeeksSendoutLeaders', sender: 'mario.moreno@gogpac.com', template_id: 'd-e91941a8994440eeb59644949368dfc5' },
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
            'd-e91941a8994440eeb59644949368dfc5',
          ])
          .delete();
      });
    });
  }
}

module.exports = SendgridConfigurationLastWeeksLeaderEmailsSchema
