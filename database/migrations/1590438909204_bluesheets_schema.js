'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class BluesheetsSchema extends Schema {
  up () {
    this
    .raw(`UPDATE blue_sheets SET achievement_two = '' WHERE achievement_two is NULL`)
    .raw(`UPDATE blue_sheets SET achievement_three = '' WHERE achievement_three is NULL`)
    .raw(`UPDATE blue_sheets SET interview_dates = '[]' WHERE interview_dates is NULL`)
    .raw(`UPDATE blue_sheets SET notes = '' WHERE notes is NULL`)
    .raw(`UPDATE blue_sheets SET time_start_type_id = 1 WHERE time_start_type_id is NULL`)
    .table('blue_sheets', (table) => {
      table.string('achievement_two', 254).notNullable().alter();
      table.string('achievement_three', 254).notNullable().alter();
      table.text('interview_dates').notNullable().alter();
      table.string('notes', 30).notNullable().alter();
      table.integer('time_start_type_id').unsigned().notNullable().alter();
    })
  }

  down () {
    this.table('blue_sheets', (table) => {
      table.string('achievement_two', 254).nullable().alter();
      table.string('achievement_three', 254).nullable().alter();
      table.text('interview_dates').nullable().alter();
      table.string('notes', 30).nullable().alter();
      table.integer('time_start_type_id').unsigned().nullable().alter();
    })
  }
}

module.exports = BluesheetsSchema
