'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class RcMessagesInsertedActivityLogsSchema extends Schema {
  up () {
    this.create('rc_messages_inserted_activity_logs', (table) => {
      table.string('id', 20).primary();
      table.json('to');
      table.json('from');
      table.string('type', 30);
      table.datetime('creation_time').notNullable();
      table.json('attachments');
      table.string('direction', 10).notNullable();
      table.string('availability', 50);
      table.timestamps();
    })
  }

  down () {
    this.drop('rc_messages_inserted_activity_logs')
  }
}

module.exports = RcMessagesInsertedActivityLogsSchema

