'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class SendoutEmailDetailSchema extends Schema {
  up () {
    this.create('sendout_email_details', (table) => {
      table.increments()
      table.jsonb('cc_emails');
      table.jsonb('bcc_emails');
      table.integer('sendout_template_id')
      .unsigned()
      .references('id')
      .inTable('sendout_templates');
      table.string('subject', 254);
      table.text('template');
      table.timestamps()
    })
  }

  down () {
    this.drop('sendout_email_details')
  }
}

module.exports = SendoutEmailDetailSchema
