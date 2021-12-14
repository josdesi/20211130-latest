'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');
const Database = use('Database');

class JobOrderTypeSchema extends Schema {
  up() {
    this.table('job_order_types', (table) => {
      // alter table
    });

    this.schedule(async (trx) => {
      try {
        const jobOrderStatuses = `
          WITH temp AS (
            select id, job_order_id, job_order_type_id  from white_sheets where job_order_type_id > 2 order by job_order_type_id asc
          )
          UPDATE job_orders
            SET status_id =
            CASE
              WHEN temp.job_order_type_id = 3 THEN 2
              WHEN temp.job_order_type_id = 4 THEN 4
              WHEN temp.job_order_type_id = 5 THEN 5
            END
          FROM temp
          WHERE job_orders.id = temp.job_order_id
        `;

        const WriteSheetTypes = `
          WITH temp AS (
            select id, job_order_id, job_order_type_id  from white_sheets where job_order_type_id > 2 order by job_order_type_id asc
          )
          UPDATE white_sheets
            SET job_order_type_id = 0
          FROM temp
          WHERE white_sheets.id = temp.id
        `;

        await Database.raw(jobOrderStatuses).transacting(trx);
        await Database.raw(WriteSheetTypes).transacting(trx);
      } catch (error) {
        await trx.rollback();
        throw error;
      }
    });
  }

  down() {
    this.table('job_order_types', (table) => {
      // reverse alternations
    });
  }
}

module.exports = JobOrderTypeSchema;
