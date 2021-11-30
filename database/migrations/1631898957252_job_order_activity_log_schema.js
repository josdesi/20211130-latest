'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');
const Database = use('Database');

class JobOrderActivityLogSchema extends Schema {
  up() {
    this.schedule(async (transaction) => {
      try {
        const bulkReferenceSubquery = Database.table('job_order_bulk_activity_references').select(
          'job_order_activity_log_id'
        );

        await Database.table('job_order_activity_logs')
          .transacting(transaction)
          .update({ created_by_system: true })
          .whereIn('id', bulkReferenceSubquery);

        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    });
  }
}

module.exports = JobOrderActivityLogSchema;
