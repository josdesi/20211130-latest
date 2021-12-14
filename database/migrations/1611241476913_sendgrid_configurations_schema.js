'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database');

class SendgridConfigurationsSchema extends Schema {
  up() {
    this.table('sendgrid_configurations', (table) => {
      this.schedule(async (transaction) => {
        await Database.table('sendgrid_configurations')
          .transacting(transaction)
          .insert([
            { type: 'fee_agreement_InsertHereTheSpecificOne', sender: 'notifications@gogpac.com', template_id: 'd-572bab2111b54743a73c8639b40c56c5' },
          ]);
      });
    });
  }
}

module.exports = SendgridConfigurationsSchema
