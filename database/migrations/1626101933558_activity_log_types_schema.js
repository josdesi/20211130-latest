'use strict'
const { activityLogTypes } = use('App/Helpers/Globals');

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database')

class ActivityLogTypeSchema extends Schema {
  up () {
    this.schedule(async (trx) => {
      await Database.table('activity_log_types').transacting(trx).insert([
        { id: activityLogTypes.ConversionOfSendover, title: 'Sendover Converted to Sendout' },
        { id: activityLogTypes.NoOffer, title: 'Sendout Marked as No Offer' },
        { id: activityLogTypes.Declined, title: 'Sendout Marked as Offer Declined' },
      ])
    })
  }

  down () {
    this.table('activity_log_types', (table) => {
      // reverse alternations
    })
  }
}

module.exports = ActivityLogTypeSchema
