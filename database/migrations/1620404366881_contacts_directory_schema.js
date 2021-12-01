'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class ContactsDirectorySchema extends Schema {
  up () {
    this.table('contacts_directory', (table) => {
      table.string('country', 255);
      table.string('country_slug', 10);
      table.integer('country_id').references('id').inTable('countries');

      table.string('state', 255);
      table.string('state_slug', 10);
      table.integer('state_id').references('id').inTable('states');

      table.string('city', 255);
      table.integer('city_id').references('id').inTable('cities');

      table.string('zip', 35);

      table.string('location', 255);
      table.string('industry_specialty', 255);
    })
  }

  down () {
    this.table('contacts_directory', (table) => {
      table.dropColumn('country');
      table.dropColumn('country_id');
      table.dropColumn('country_slug');

      table.dropColumn('state');
      table.dropColumn('state_id');
      table.dropColumn('state_slug');

      table.dropColumn('city');
      table.dropColumn('city_id');

      table.dropColumn('zip');
      table.dropColumn('location');
      table.dropColumn('industry_specialty');
    })
  }
}

module.exports = ContactsDirectorySchema
