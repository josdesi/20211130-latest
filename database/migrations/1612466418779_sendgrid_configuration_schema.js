'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');
const Database = use('Database');

class SendgridConfigurationSchema extends Schema {
  up() {
    this.table('sendgrid_configurations', (table) => {
      this.schedule(async (transaction) => {
        await Database.table('sendgrid_configurations')
          .transacting(transaction)
          .insert([
            { type: 'feeSummaryCount', sender: 'notifications@gogpac.com', template_id: 'd-1165a955c5104c399b5c40df28c3994e' },
          ]);
      });
    });
  }
}

module.exports = SendgridConfigurationSchema;
