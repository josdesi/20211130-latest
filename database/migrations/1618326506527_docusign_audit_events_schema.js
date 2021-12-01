'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class DocusignAuditEventsSchema extends Schema {
  up () {
    this.table('docusign_audit_events', (table) => {
      table.boolean('processed');
    })
  }

  down () {
    this.table('docusign_audit_events', (table) => {
      table.dropColumn('processed');
    })
  }
}

module.exports = DocusignAuditEventsSchema
