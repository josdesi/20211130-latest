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
          { type: 'bulkEmailSuccessfullySent', sender: 'notifications@gogpac.com', template_id: 'd-8b42a446d24d4da8a9e812d11474fd63' },
        ]);
    });
  }

  down() {
    this.drop('sendgrid_configurations');
  }
}

module.exports = SendgridConfigurationSchema;
