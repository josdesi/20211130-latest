'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class PlacementPaymentSchema extends Schema {
  up () {
    this.create('placement_payments', (table) => {
      table.increments()
      table.float('amount');
      table
        .integer('placement_id')
        .unsigned()
        .references('id')
        .inTable('placements');
      table.integer('created_by')
        .notNullable()
        .references('id')
        .inTable('users');
      table.integer('updated_by')
        .notNullable()
        .references('id')
        .inTable('users');
      table.timestamps()
    })
  }

  down () {
    this.drop('placement_payments')
  }
}

module.exports = PlacementPaymentSchema
