'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class ChangeLimitLogPlacementOperationSchema extends Schema {
  up () {
    this.table('placement_logs', (table) => {
      // alter table
      table.string('operation', 32).alter();
    })
  }

  down () {
    this.table('placement_logs', (table) => {
      // reverse alternations
      table.string('operation', 16).alter();
    })
  }
}

module.exports = ChangeLimitLogPlacementOperationSchema
