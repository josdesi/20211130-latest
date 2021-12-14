'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');
const Database = use('Database');

class HiringAuthorityActivityLogSchema extends Schema {
  up() {
    this.schedule(async (transaction) => {
      try {
        const bulkReferenceSubquery = Database.table('hiring_authority_bulk_activity_references').select(
          'hiring_authority_activity_log_id'
        );

        await Database.table('hiring_authority_activity_logs')
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

module.exports = HiringAuthorityActivityLogSchema;
