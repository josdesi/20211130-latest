'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database');


class SendgridConfigurationSchema extends Schema {
  up () {
    this.create('sendgrid_configurations', (table) => {
      table.increments()
      table.string('type', 50).notNullable();
      table.string('sender', 50).notNullable();
      table.string('template_id', 50).notNullable();
      table.timestamps()
    })

    this.schedule(async (transaction) => {
      await Database.table('sendgrid_configurations')
        .transacting(transaction)
        .insert([
          { type: 'summary', sender: 'notifications@gogpac.com', template_id: 'd-fa3528d6ce8d432ab16810ccce0a5b66' },
        ]);
    });
  }

  down () {
    this.drop('sendgrid_configurations')
  }
}

module.exports = SendgridConfigurationSchema
