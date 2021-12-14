'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');
const Database = use('Database');
const { activityLogTypes } = use('App/Helpers/Globals');

class ActivityLogTypesSchema extends Schema {
  up () {
    this.schedule(async (trx) => {
      await Database.table('activity_log_types').transacting(trx).insert([
        { id: activityLogTypes.Voicemail, title: 'Voicemail', available: 1 },
      ])
    });
  }

  down () {
    
  }
}

module.exports = ActivityLogTypesSchema
