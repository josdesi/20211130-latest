'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');
const Database = use('Database');

class SendgridConfigurationsSchema extends Schema {
  up() {
    this.table('sendgrid_configurations', (table) => {
      this.schedule(async (transaction) => {
        await Database.table('sendgrid_configurations')
          .transacting(transaction)
          .insert([{ type: 'bulk', sender: 'notifications@gogpac.com' , template_id: 'null'}]);
      });
    });
  }
}

module.exports = SendgridConfigurationsSchema;
