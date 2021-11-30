'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class SendgridDailySendoutLeaderEmailsSchema extends Schema {
  up () {
    this.table('sendgrid_configurations', (table) => {
      this.schedule(async (transaction) => {
        await transaction.table('sendgrid_configurations')
          .insert([
            { type: 'DailySendoutLeaders', sender: 'mario.moreno@gogpac.com', template_id: 'd-a2ac323c92c44936850e4fb68af24b6a' },
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
            'd-a2ac323c92c44936850e4fb68af24b6a',
          ])
          .delete();
      });
    });
  }
}

module.exports = SendgridDailySendoutLeaderEmailsSchema
