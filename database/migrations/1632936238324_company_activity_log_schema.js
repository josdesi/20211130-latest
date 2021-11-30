'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');
const Database = use('Database');
const { activityLogTypes } = use('App/Helpers/Globals');

class CompanyActivityLogSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      try {
        await Database.table('company_activity_logs')
          .transacting(transaction)
          .update({ activity_log_type_id: activityLogTypes.Call })
          .where('activity_log_type_id', activityLogTypes.AutomaticCall);
          
        await Database.table('company_activity_logs')
          .transacting(transaction)
          .update({ activity_log_type_id: activityLogTypes.SMS })
          .where('activity_log_type_id', activityLogTypes.AutomaticText)

        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    });
  }

  down () {
    this.table('company_activity_logs', (table) => {
      // reverse alternations
    })
  }
}

module.exports = CompanyActivityLogSchema
