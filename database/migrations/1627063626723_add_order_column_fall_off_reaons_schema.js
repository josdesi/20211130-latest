'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class AddOrderColumnFallOffReaonsSchema extends Schema {
  up () {
    this.table('placement_fall_off_reasons', (table) => {
      // alter table
      table.integer('order');
    })
  }

  down () {
    this.table('placement_fall_off_reasons', (table) => {
      // reverse alternations
      table.dropColumn('order');
    })
  }
}

module.exports = AddOrderColumnFallOffReaonsSchema
