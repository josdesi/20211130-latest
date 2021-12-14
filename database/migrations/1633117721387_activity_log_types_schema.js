'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');
const Database = use('Database');
const { activityLogTypes } = use('App/Helpers/Globals');

class ActivityLogTypesSchema extends Schema {
  up() {
    this.schedule(async (trx) => {
      await Database.table('activity_log_types')
        .transacting(trx)
        .insert([
          { id: activityLogTypes.SendoutDeleted, title: 'Sendout Deleted', available: 0 },
          { id: activityLogTypes.SendoverDeleted, title: 'Sendover Deleted', available: 0 },
        ]);
    });
  }
}

module.exports = ActivityLogTypesSchema;
