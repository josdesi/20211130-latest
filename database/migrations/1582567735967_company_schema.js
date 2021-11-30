'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class CompanySchema extends Schema {
  up() {
    this.create('companies', table => {
      table.increments();
      table
        .integer('industry_id')
        .unsigned()
        .references('id')
        .inTable('industries');
      table
        .integer('contact_id')
        .unsigned()
        .references('id')
        .inTable('contacts');
      table
        .integer('address_id')
        .unsigned()
        .references('id')
        .inTable('addresses');
      table
        .integer('recruiter_id')
        .unsigned()
        .references('id')
        .inTable('users');
      table.string('name', 254).notNullable();
      table
        .string('email', 64)
        .notNullable()
        .unique();
      table.string('file_name',254)
      table.string('website', 254);
      table.string('link_profile', 254);
      table.text('fee_agreement_url')//Add NotNullable on upcomings features
      table.timestamps();
      table.integer('created_by');
      table.integer('updated_by');
    });
  }

  down() {
    this.drop('companies');
  }
}

module.exports = CompanySchema;
