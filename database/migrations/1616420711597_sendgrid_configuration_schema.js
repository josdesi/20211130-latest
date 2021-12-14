'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');
const Database = use('Database');

class SendgridConfigurationSchema extends Schema {
  up() {
    this.schedule(async (transaction) => {
      await Database.table('sendgrid_configurations')
        .transacting(transaction)
        .insert([
          { type: 'opsCompanyTypeVerification', sender: 'notifications@gogpac.com', template_id: 'd-9fe38624d9014ced8584c938842b35c3' },
        ]);
    });
  }

  down() {
    this.drop('sendgrid_configurations');
  }
}

module.exports = SendgridConfigurationSchema;
