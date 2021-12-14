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
          { type: 'FeeAgreementsUnsigned', sender: 'roberto.deanda@gogpac.com', template_id: 'd-bad6558bcafd476b9a7bec40c763939e', sender_name: 'Robert' },
        ]);
    });
  }

  down() {
    this.drop('sendgrid_configurations');
  }
}

module.exports = SendgridConfigurationSchema;
