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
          { type: 'UnconvertedSendovers', sender: 'roberto.deanda@gogpac.com', template_id: 'd-23aefd5317124340825314c51b3e00a9', sender_name: 'Robert' },
        ]);
    });
  }

  down() {
    this.drop('sendgrid_configurations');
  }
}

module.exports = SendgridConfigurationSchema;
