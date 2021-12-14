'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class WhiteSheetSchema extends Schema {
  up () {
    this.create('white_sheets', (table) => {
      table.increments();
      table
        .integer('job_order_id')
        .unsigned()
        .references('id')
        .inTable('job_orders')
        .notNullable();
      table.specificType('relocation_assistance', 'smallint').notNullable();
      table
        .integer('job_order_type_id')
        .unsigned()
        .references('id')
        .inTable('job_order_types')
        .notNullable();
      table.specificType('discussing_agreement_complete', 'smallint').notNullable();
      table
        .integer('fee_agreement_type_id')
        .unsigned()
        .references('id')
        .inTable('fee_agreement_types')
        .notNullable();
      table.integer('fee_agreement_percent').notNullable();
      table.string('time_position_open',50).notNullable();
      table.string('position_filled',50).notNullable();
      table.integer('minimum_compensation').notNullable();
      table.integer('good_compensation').notNullable();
      table.integer('maximum_compensation').notNullable();
      table.string('benefits', 254)
      table.float('first_year_compensation').notNullable();
      table.text('background_requirements').notNullable();
      table.text('preset_interview_dates')
      table.timestamps();
    })
  }

  down () {
    this.drop('white_sheets')
  }
}

module.exports = WhiteSheetSchema
