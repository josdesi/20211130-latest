'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class ReferenceReleaseEmailSchema extends Schema {
  up () {
    this.create('reference_release_emails', (table) => {
      table.increments()
      table
        .integer('candidate_id')
        .unsigned()
        .references('id')
        .inTable('candidates');
      table.specificType('to', 'character varying[]');
      table.specificType('cc', 'character varying[]');
      table.specificType('bcc', 'character varying[]');
      table.string('subject', 254);
      table.text('body').notNullable();
      table.integer('created_by')
        .unsigned()
        .references('id')
        .inTable('users');
      table.integer('updated_by')
        .unsigned()
        .references('id')
        .inTable('users');
      table.timestamps()
    })
  }

  down () {
    this.drop('reference_release_emails');
  }
}

module.exports = ReferenceReleaseEmailSchema
