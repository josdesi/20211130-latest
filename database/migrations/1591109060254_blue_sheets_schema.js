'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class BlueSheetsSchema extends Schema {
  up () {
    this.table('blue_sheets', (table) => {
      table.string('achievement_one', 1024).notNullable().alter()
      table.string('achievement_two', 1024).notNullable().alter()
      table.string('achievement_three', 1024).notNullable().alter()
    })
  }

  down () {
    this.table('blue_sheets', (table) => {
      table.string('achievement_one', 254).notNullable().alter()
      table.string('achievement_two', 254).notNullable().alter()
      table.string('achievement_three', 254).notNullable().alter()
    })
  }
}

module.exports = BlueSheetsSchema
