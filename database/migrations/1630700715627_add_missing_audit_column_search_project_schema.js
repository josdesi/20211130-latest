'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class AddMissingAuditColumnSearchProjectSchema extends Schema {
  up () {
    this.table('search_projects', (table) => {
      // alter table
      table.integer('updated_by').references('id').inTable('users');
    })
  }

  down () {
    this.table('search_projects', (table) => {
      // reverse alternations
      table.dropColumn('updated_by');
    })
  }
}

module.exports = AddMissingAuditColumnSearchProjectSchema
