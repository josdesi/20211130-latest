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
      try {
        const candidateStatuses = `
          WITH temp AS (
            select id, candidate_id, candidate_type_id  from blue_sheets where candidate_type_id > 2 order by candidate_type_id asc
          )
          UPDATE candidates
            SET status_id =
            CASE
              WHEN temp.candidate_type_id = 3 THEN 2
              WHEN temp.candidate_type_id = 4 THEN 4
              WHEN temp.candidate_type_id = 5 THEN 5
            END
          FROM temp
          WHERE candidates.id = temp.candidate_id
        `;

        const BlueSheetTypes = `
          WITH temp AS (
            select id, candidate_id, candidate_type_id  from blue_sheets where candidate_type_id > 2 order by candidate_type_id asc
          )
          UPDATE blue_sheets
            SET candidate_type_id = 0
          FROM temp
          WHERE blue_sheets.id = temp.id
        `;

        await Database.raw(candidateStatuses).transacting(trx);
        await Database.raw(BlueSheetTypes).transacting(trx);
      } catch (error) {
        await trx.rollback();
        throw error;
      }
    });
  }

  down () {
    this.table('candidate_types', (table) => {
      // reverse alternations
    })
  }
}

module.exports = CandidateTypeSchema
