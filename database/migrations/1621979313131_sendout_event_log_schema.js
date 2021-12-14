'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class SendoutEventLogSchema extends Schema {
  up () {
    this.create('sendout_event_logs', (table) => {
      table.increments()

      table.integer('sendout_id')
        .references('id')
        .inTable('sendouts');

      table.integer('triggered_by_user_id')
        .references('id')
        .inTable('users');

      table.integer('event_type_id')
        .references('id')
        .inTable('sendout_event_types');

      table.jsonb('event_details');

      table.timestamp('real_date');

      table.timestamps()
    })
  }

  down () {
    this.drop('sendout_event_logs')
  }
}

module.exports = SendoutEventLogSchema
