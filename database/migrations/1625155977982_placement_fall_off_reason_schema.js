'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');


class PlacementFallOffReasonSchema extends Schema {
  up () {
    this.create('placement_fall_off_reasons', (table) => {
      table.increments()
      table.string('title');
      table.timestamps()
    })
  }

  down () {
    this.drop('placement_fall_off_reasons')
  }
}

module.exports = PlacementFallOffReasonSchema
