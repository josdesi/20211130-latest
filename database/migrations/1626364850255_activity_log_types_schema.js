'use strict'
const { activityLogTypes } = use('App/Helpers/Globals');

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database')

class ActivityLogTypeSchema extends Schema {
  up () {
    this.schedule(async (trx) => {
      await Database.table('activity_log_types').where('id', activityLogTypes.Sendout,).transacting(trx).update({ title: 'Sendout Registered' });
      await Database.table('activity_log_types').where('id', activityLogTypes.Sendover,).transacting(trx).update({ title: 'Sendover Registered' });
      await Database.table('activity_log_types').where('id', activityLogTypes.Interview,).transacting(trx).update({ title: 'New Interview Registered' });
    })
  }

  down () {
    this.table('activity_log_types', (table) => {
      // reverse alternations
    })
  }
}

module.exports = ActivityLogTypeSchema
