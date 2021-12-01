'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class CandidateSchema extends Schema {
  up() {
    this.create('candidates', table => {
      table.increments();
      table
        .integer('personal_information_id')
        .unsigned()
        .references('id')
        .inTable('personal_informations');
      table
        .integer('industry_id')
        .unsigned()
        .references('id')
        .inTable('industries');
      table
        .integer('position_id')
        .unsigned()
        .references('id')
        .inTable('positions');
      table
        .integer('status_id')
        .unsigned()
        .references('id')
        .inTable('candidate_statuses');
      table
        .integer('recruiter_id')
        .unsigned()
        .references('id')
        .inTable('users');
      table
        .string('email', 64)
        .notNullable()
        .unique();
      table
        .integer('source_type_id')
        .unsigned()
        .references('id')
        .inTable('source_types');
      table
        .integer('sub_status_id')
        .unsigned()
        .references('id')
        .inTable('sendout_statuses');
      table.string('link_profile', 254);
      table.string('title', 254).notNullable();
      table.specificType('hot_item', 'smallint');
      table.datetime('hot_item_date');
      table.string('current_company', 254);
      table.timestamps();
      table.integer('created_by');
      table.integer('updated_by');
    });
  }

  down() {
    this.drop('candidates');
  }
}

module.exports = CandidateSchema;
