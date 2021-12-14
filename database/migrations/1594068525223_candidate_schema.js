'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database')

class CandidateSchema extends Schema {
  up () {
    this.table('candidates', (table) => {
      // alter table
      table.dropColumn('stand_by_date')
      table.dropColumn('inactive_date')
    })
    this.schedule(async (transaction) => {
      const updateActivityDate = `
        UPDATE candidates set last_activity_date = CASE WHEN subquery.activities > 0 THEN subquery.activity_date ELSE null END
        FROM (
          SELECT ca.id,max(cal.created_at) as activity_date, ca.created_at as candidate_date,count(cal.id) as activities
          FROM
            candidates as ca
          LEFT JOIN candidate_activity_logs as cal ON ca.id = cal.candidate_id
          GROUP BY (ca.id,candidate_date)
        ) as subquery
        WHERE candidates.id = subquery.id
      `;
  
      await Database.raw(updateActivityDate).transacting(transaction);
    })
  }

  down () {
    this.table('candidates', (table) => {
      // reverse alternations
      table.dropColumn('last_activity_date')
    })
  }
}

module.exports = CandidateSchema
