'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class PlacementLogChangesSchema extends Schema {
  up () {
    this.renameTable('placement_change_logs', 'placement_logs')
  }

  down () {
    this.renameTable('placement_logs', 'placement_change_logs')
  }
}

module.exports = PlacementLogChangesSchema
