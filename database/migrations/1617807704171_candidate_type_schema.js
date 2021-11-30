'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database');

class CandidateTypeSchema extends Schema {
  up () {
    this.table('candidate_types', (table) => {
      // alter table
    })

    this.schedule(async (trx) => {
      const query = `
        UPDATE candidate_types
          SET available = 0
        WHERE candidate_types.id > 2
      `;

      try {
        await Database.raw(query).transacting(trx);
        await trx.commit();
      } catch (error) {
        await trx.rollback();
        throw error;
      }
    })
  }

  down () {
    this.table('candidate_types', (table) => {
      // reverse alternations
    })
  }
}

module.exports = CandidateTypeSchema
