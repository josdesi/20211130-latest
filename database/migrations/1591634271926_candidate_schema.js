'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database')

class CandidateSchema extends Schema {
  up () {
    this.table('candidates', (table) => {
      // alter table
      table.datetime('last_activity_date')
      table.datetime('stand_by_date')
      table.datetime('inactive_date')
    })
    this.schedule(async (transaction) => {
      const updateActivityDate = `
        UPDATE candidates set last_activity_date = CASE WHEN subquery.activities > 0 THEN subquery.activity_date ELSE candidate_date END
        FROM (
          SELECT ca.id,max(cal.created_at) as activity_date, ca.created_at as candidate_date,count(cal.id) as activities
          FROM
            candidates as ca
          LEFT JOIN candidate_activity_logs as cal ON ca.id = cal.candidate_id
          GROUP BY (ca.id,candidate_date)
        ) as subquery
        WHERE candidates.id = subquery.id
      `;
      const updateStandByDate = `
        UPDATE candidates set stand_by_date = candidates.last_activity_date + INTERVAL '1 day' 
      `;
      const updateInactiveDate = `
        UPDATE candidates set inactive_date = candidates.stand_by_date + INTERVAL '3 day' 
      `;

      await Database.raw(updateActivityDate).transacting(transaction)
      await Database.raw(updateStandByDate).transacting(transaction)
      await Database.raw(updateInactiveDate).transacting(transaction)
    })
  }

  down () {
    this.table('candidates', (table) => {
      // reverse alternations
      table.dropColumn('last_activity_date')
      table.dropColumn('stand_by_date')
      table.dropColumn('inactive_date')
    })
  }
}

module.exports = CandidateSchema
