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
          { type: 'sendoutNotification', sender: 'notifications@gogpac.com', template_id: 'd-aa0688e2368443c19a76b0e6f5718f98' },
          { type: 'sendoverNotification', sender: 'notifications@gogpac.com', template_id: 'd-c8afa6f6df6e49a5b123060441fb6964' },
        ]);
    });
  }

  down() {
    this.drop('sendgrid_configurations');
  }
}

module.exports = SendgridConfigurationSchema;
