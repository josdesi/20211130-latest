'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database')

class JobOrderSchema extends Schema {
  up () {
    this.table('job_orders', (table) => {
      // alter table
      table.datetime('last_activity_date')
    })
    this.schedule(async (transaction) => {
      const updateActivityDate = `
        UPDATE job_orders set last_activity_date = CASE WHEN subquery.activities > 0 THEN subquery.activity_date ELSE null END
        FROM (
          SELECT jo.id,max(jol.created_at) as activity_date, count(jol.id) as activities
          FROM
            job_orders as jo
          LEFT JOIN job_order_activity_logs as jol ON jo.id = jol.job_order_id
          GROUP BY (jo.id)
        ) as subquery
        WHERE job_orders.id = subquery.id
      `;
  
      await Database.raw(updateActivityDate).transacting(transaction);
    })
  }

  down () {
    this.table('job_orders', (table) => {
      // reverse alternations
      table.dropColumn('last_activity_date')
    })
  }
}

module.exports = JobOrderSchema
