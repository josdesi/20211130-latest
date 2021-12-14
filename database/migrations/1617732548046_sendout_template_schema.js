'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class SendoutTemplateSchema extends Schema {
  up () {
    this.table('sendout_templates', (table) => {
      // alter table
      table.integer('sendout_type_id')
      .unsigned()
      .references('id')
      .inTable('sendout_types');
    })
  }

  down () {
    this.table('sendout_templates', (table) => {
      // reverse alternations
      table.dropColumn('sendout_type_id');
    })
  }
}

module.exports = SendoutTemplateSchema
