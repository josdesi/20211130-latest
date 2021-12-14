'use strict'
const { activityLogTypes } = use('App/Helpers/Globals');

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');
const Database = use('Database');

class ActivityLogTypesSchema extends Schema {
  up () {
    this.schedule(async (trx) => {
      await Database.table('activity_log_types').transacting(trx).insert([
        { id: activityLogTypes.AutomaticCall, title: 'Call', available: 0 },
        { id: activityLogTypes.AutomaticText, title: 'Text', available: 0 },
      ])
    });

    this.schedule(async (trx) => {
      const queryUpdateText = `
        UPDATE activity_log_types
          SET title = 'Manual Text'
        WHERE activity_log_types.id = ${activityLogTypes.SMS};
        UPDATE activity_log_types
          SET title = 'Manual Call'
        WHERE activity_log_types.id = ${activityLogTypes.Call};
      `;

      try {
        await Database.raw(queryUpdateText).transacting(trx);
        await trx.commit();
      } catch (error) {
        await trx.rollback();
        throw error;
      }
    });
  }

  down () {
    this.table('activity_log_types', (table) => {
      // reverse alternations
    })
  }
}

module.exports = ActivityLogTypesSchema
