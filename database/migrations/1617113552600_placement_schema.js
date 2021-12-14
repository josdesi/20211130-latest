'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class PlacementSchema extends Schema {
  up () {
    this.create('placements', (table) => {
      table.increments()
      table.float('fee_amount'),
      table.float('fee_percent')
      table.float('first_year_value')
      table.datetime('start_date');
      table.integer('service_months')
      table.string('fee_agreement_payment_scheme_id')
        .unsigned()
        .references('id')
        .inTable('fee_agreement_payment_schemes')
        .notNullable();
      table.integer('placement_status_id')
        .notNullable()
        .references('id')
        .inTable('placement_statuses');
      table.timestamps()
    })
  }

  down () {
    this.drop('placements')
  }
}

module.exports = PlacementSchema
