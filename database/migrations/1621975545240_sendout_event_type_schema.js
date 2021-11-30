'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class SendoutEventTypeSchema extends Schema {
  up () {
    this.create('sendout_event_types', (table) => {
      table.increments()
      table.string('name', 255);
      table.boolean('show_in_history_log');
      table.timestamps()
    })
  }

  down () {
    this.drop('sendout_event_types')
  }
}

module.exports = SendoutEventTypeSchema
