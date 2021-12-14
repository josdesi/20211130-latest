'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class ClientAppRegistrationsSchema extends Schema {
  up () {
    this.create('client_app_registrations', (table) => {
      table.string('client_id', 64).primary();
      table.string('client_secret_app', 64).notNullable().unique();
      table.string('client_app_name', 50).notNullable();
      table.string('client_app_description', 500);
      table.specificType('available', 'smallint').notNullable();
      table.timestamps();
    })
  }

  down () {
    this.drop('client_app_registrations')
  }
}

module.exports = ClientAppRegistrationsSchema
