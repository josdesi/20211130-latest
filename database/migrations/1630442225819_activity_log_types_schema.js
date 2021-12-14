'use strict'
const { activityLogTypes } = use('App/Helpers/Globals');

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database')

class ActivityLogTypeSchema extends Schema {
  up () {
    this.schedule(async (trx) => {
      await Database.table('activity_log_types').transacting(trx).insert([
        { id: activityLogTypes.SendoverNoOffer, title: 'Sendover Marked as No Offer' },
        { id: activityLogTypes.SendoverDeclined, title: 'Sendover Marked as Offer Declined' },
      ])
    })
  }

  down () {
  }
}

module.exports = ActivityLogTypeSchema
