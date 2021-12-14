'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database');

class CandidateTypeSchema extends Schema {
  up () {
    this.create('candidate_types', (table) => {
      table.increments();
      table
        .string('title', 25)
        .notNullable()
        .unique();
      table.integer('created_by');
      table.integer('updated_by');
      table.timestamps();
    })

    // copy data
    this.schedule(async (trx) => {
      await Database.table('candidate_types').transacting(trx).insert([
        { id: 0, title: 'Alpha' },
        { id: 1, title: 'POEJO' },
        { id: 2, title: "Can't tell" }
      ])
    })
  }

  down () {
    this.drop('candidate_types')
  }
}

module.exports = CandidateTypeSchema
