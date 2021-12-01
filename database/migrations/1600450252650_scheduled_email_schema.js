'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class ScheduledEmailSchema extends Schema {
  up () {
    this.create('scheduled_emails', (table) => {
      table.increments()
      table.integer('created_by').unsigned().references('id').inTable('users');
      table.timestamp('send_date');
      table.integer('email_history_id').unsigned().references('id').inTable('email_histories');
      table.timestamps()
    })
  }

  down () {
    this.drop('scheduled_emails')
  }
}

module.exports = ScheduledEmailSchema
