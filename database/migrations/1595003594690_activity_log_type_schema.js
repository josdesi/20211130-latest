'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database')

class ActivityLogTypeSchema extends Schema {
  up () {
    this.schedule(async (trx) => {
      await Database.table('activity_log_types').transacting(trx).insert([
        { id: 15, title: 'Pending Offer' },
        { id: 16, title: 'Offer Sent' },
        { id: 17, title: 'Offer Accepted' },
        { id: 18, title: 'References Completed' },
        { id: 19, title: 'References Release Form Sent' },
        { id: 20, title: 'Interview' },
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
