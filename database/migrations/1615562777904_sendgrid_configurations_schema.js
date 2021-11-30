'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database');

class SendgridConfigurationsSchema extends Schema {
  up () {
    this.table('sendgrid_configurations', (table) => {
      // alter table
    })

    this.schedule(async (transaction) => {
      await Database.table('sendgrid_configurations')
        .transacting(transaction)
        .insert([{ type: 'sendout', sender: 'notifications@gogpac.com' , template_id: 'd-6ac676d21cfc478e81036a229d4204b1'}]);
    });
  }

  down () {
    this.table('sendgrid_configurations', (table) => {
      // reverse alternations
    })
  }
}

module.exports = SendgridConfigurationsSchema
