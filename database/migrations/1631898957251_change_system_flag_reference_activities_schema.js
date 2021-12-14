'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const { activityLogTypes } = use('App/Helpers/Globals');

class ChangeSystemFlagReferenceActivitiesSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      try {
        await transaction.table('candidate_activity_logs')
          .where('activity_log_type_id', activityLogTypes.ReferencesReleaseFormSent)
          .where('body', 'ilike', '%Reference Release Sent!%')
          .update({ created_by_system: true });

        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    });
  }

  down () {
    this.schedule(async (transaction) => {
      try {
        await transaction.table('candidate_activity_logs')
          .where('activity_log_type_id', activityLogTypes.ReferencesReleaseFormSent)
          .where('body', 'ilike', '%Reference Release Sent!%')
          .update({ created_by_system: false });

        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    });
  }
}

module.exports = ChangeSystemFlagReferenceActivitiesSchema
