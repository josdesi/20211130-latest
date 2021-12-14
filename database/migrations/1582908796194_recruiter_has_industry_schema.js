'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class RecruiterHasIndustrySchema extends Schema {
  up() {
    this.create('recruiter_has_industries', table => {
      table.increments();
      table
        .integer('recruiter_id')
        .unsigned()
        .references('id')
        .inTable('users');
      table
        .integer('industry_id')
        .unsigned()
        .references('id')
        .inTable('industries');
      table
        .integer('state_id')
        .unsigned()
        .references('id')
        .inTable('states');
      table
        .integer('coach_id')
        .unsigned()
        .references('id')
        .inTable('users');
      table.timestamps();
    });
  }

  down() {
    this.drop('recruiter_has_industries');
  }
}

module.exports = RecruiterHasIndustrySchema;
