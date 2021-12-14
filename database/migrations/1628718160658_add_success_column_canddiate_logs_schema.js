'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class AddSuccessColumnCanddiateLogsSchema extends Schema {
  up () {
    this.table('candidate_change_logs', (table) => {
      // alter table
      table.boolean('successful_operation').defaultTo(true);
    })
  }

  down () {
    this.table('candidate_change_logs', (table) => {
      // reverse alternations
      table.dropColumn('successful_operation');
    })
  }
}

module.exports = AddSuccessColumnCanddiateLogsSchema
