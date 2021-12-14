'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class BulkEmailMarketingCandidateSchema extends Schema {
  up() {
    this.create('bulk_email_marketing_candidates', (table) => {
      table.increments();
      table.integer('candidate_id').unsigned().references('id').inTable('candidates').notNullable().index();
      table.integer('email_history_id').unsigned().references('id').inTable('email_histories').notNullable().index();
      table.timestamps();
    });
  }

  down() {
    this.drop('bulk_email_marketing_candidates');
  }
}

module.exports = BulkEmailMarketingCandidateSchema;
