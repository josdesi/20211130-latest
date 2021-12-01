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
            { type: 'feeValidationEmail', sender: 'notifications@gogpac.com', template_id: 'd-c62ca0ad8590425c9424b70825d7a3ce' },
          ]);
      });
    });
  }
}

module.exports = SendgridConfigurationSchema;
