'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class CandidateChangeLogSchema extends Schema {
  up () {
    this.create('candidate_change_logs', (table) => {
      table.increments();
      table.integer('candidate_id').unsigned().notNullable().references('id').inTable('candidates');
      table.integer('created_by').references('id').inTable('users');
      table.string('entity', 16).notNullable();
      table.string('operation', 16).notNullable();
      table.jsonb('payload');
      table.timestamps();
    })
  }

  down () {
    this.drop('candidate_change_logs')
  }
}

module.exports = CandidateChangeLogSchema
