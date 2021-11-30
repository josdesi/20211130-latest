'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');
const Database = use('Database');
const { activityLogTypes } = use('App/Helpers/Globals');

class NameActivityLogSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      try {
        await Database.table('name_activity_logs')
          .transacting(transaction)
          .update({ activity_log_type_id: activityLogTypes.Call })
          .where('activity_log_type_id', activityLogTypes.AutomaticCall);
          
        await Database.table('name_activity_logs')
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
    this.table('name_activity_logs', (table) => {
      // reverse alternations
    })
  }
}

module.exports = NameActivityLogSchema
