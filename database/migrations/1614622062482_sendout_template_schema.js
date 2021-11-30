'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const defaultEmails = ['sendouts@gogpac.com'];

class SendoutTemplateSchema extends Schema {
  up () {
    this.table('sendout_templates', (table) => {
      // alter table
      table.jsonb('bcc_emails').defaultTo(JSON.stringify(defaultEmails));
    })
  }

  down () {
    this.table('sendout_templates', (table) => {
      // reverse alternations
      table.dropColumn('bcc_emails');
    })
  }
}

module.exports = SendoutTemplateSchema
