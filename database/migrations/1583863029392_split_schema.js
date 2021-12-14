'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class SplitSchema extends Schema {
  up() {
    this.create('splits', table => {
      table.increments();
      table
        .integer('sendout_id')
        .unsigned()
        .references('id')
        .on('sendouts');
      table
        .integer('company_owner_id')
        .unsigned()
        .references('id')
        .on('users');
      table
        .integer('candidate_owner_id')
        .unsigned()
        .references('id')
        .on('users');
      table.integer('company_owner_percent')
      table.integer('candidate_owner_percent')      
      table.timestamps();
    });
  }

  down() {
    this.drop('splits');
  }
}

module.exports = SplitSchema;
