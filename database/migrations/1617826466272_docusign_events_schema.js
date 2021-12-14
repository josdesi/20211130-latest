'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class DocusignEventsSchema extends Schema {
  up () {
    this.create('docusign_events', (table) => {
      table.string('id').primary();
      table.jsonb('data');

      table.timestamps()
    })
  }

  down () {
    this.drop('docusign_events')
  }
}

module.exports = DocusignEventsSchema
