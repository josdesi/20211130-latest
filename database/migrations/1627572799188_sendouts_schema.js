'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class SendoutsSchema extends Schema {
  up () {
    this.table('sendouts', (table) => {
      table.renameColumn('sendout_date', 'tracking_date');
    })
  }

  down () {
    this.table('sendouts', (table) => {
      table.renameColumn('tracking_date', 'sendout_date');
    })
  }
}

module.exports = SendoutsSchema
