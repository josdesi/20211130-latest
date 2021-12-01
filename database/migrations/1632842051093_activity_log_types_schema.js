'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database');
const { activityLogTypes } = use('App/Helpers/Globals');

class ActivityLogTypesSchema extends Schema {
  up () {
    this.schedule(async (trx) => {
      const queryUpdate = `
        UPDATE activity_log_types
          SET title = 'Automatic Text'
        WHERE activity_log_types.id = ${activityLogTypes.AutomaticText};
        UPDATE activity_log_types
          SET title = 'Automatic Call'
        WHERE activity_log_types.id = ${activityLogTypes.AutomaticCall};

        UPDATE activity_log_types
          SET title = 'Text'
        WHERE activity_log_types.id = ${activityLogTypes.SMS};
        UPDATE activity_log_types
          SET title = 'Call'
        WHERE activity_log_types.id = ${activityLogTypes.Call};
      `;

      try {
        await Database.raw(queryUpdate).transacting(trx);
        await trx.commit();
      } catch (error) {
        await trx.rollback();
        throw error;
      }
    });
  }

  down () {
    
  }
}

module.exports = ActivityLogTypesSchema
