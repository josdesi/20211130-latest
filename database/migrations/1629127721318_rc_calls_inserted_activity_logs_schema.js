'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class RcCallsInsertedActivityLogsSchema extends Schema {
  up () {
    this.create('rc_calls_activity_logs', (table) => {
      table.string('id', 20).primary();
      table.string('to', 30);
      table.string('from', 30);
      table.string('direction', 10).notNullable();
      table.datetime('start_time').notNullable();
      table.string('telephony_session_id', 128).index().notNullable();
      table.timestamps();
    })
  }

  down () {
    this.drop('rc_calls_activity_logs')
  }
}

module.exports = RcCallsInsertedActivityLogsSchema
