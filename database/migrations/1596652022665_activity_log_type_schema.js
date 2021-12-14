'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database');

class ActivityLogTypeSchema extends Schema {
  up () {
    this.schedule(async (trx) => {
      await Database.table('activity_log_types').transacting(trx).insert([
        { id: 22, title: 'ZoomInfo Email  ' },
        { id: 23, title: 'Linkedin Messages' },
        { id: 24, title: 'Alerts Set Up' },
        { id: 25, title: 'Linkedin Status Update' }
      ])
      await Database.raw("SELECT setval('activity_log_types_id_seq',?, true)",[25])
    })
  }
}

module.exports = ActivityLogTypeSchema
