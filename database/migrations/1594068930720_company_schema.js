'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database')

class CompanySchema extends Schema {
  up () {
    this.table('companies', (table) => {
      // alter table
      table.datetime('last_activity_date')
    })
    this.schedule(async (transaction) => {
      const updateActivityDate = `
        UPDATE companies set last_activity_date = CASE WHEN subquery.activities > 0 THEN subquery.activity_date ELSE null END
        FROM (
          SELECT cp.id,max(cpl.created_at) as activity_date, count(cpl.id) as activities
          FROM
            companies as cp
          LEFT JOIN company_activity_logs as cpl ON cp.id = cpl.company_id
          GROUP BY (cp.id)
        ) as subquery
        WHERE companies.id = subquery.id
      `;
  
      await Database.raw(updateActivityDate).transacting(transaction);
    })
  }

  down () {
    this.table('companies', (table) => {
      // reverse alternations
      table.dropColumn('last_activity_date')
    })
  }
}

module.exports = CompanySchema
