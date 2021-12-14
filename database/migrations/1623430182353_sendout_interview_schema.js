'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class SendoutInterviewSchema extends Schema {
  up () {
    this.table('sendout_interviews', (table) => {
      // alter table
      table.json('interview_range');
      table.boolean('interview_schedule');
    })
  }

  down () {
    this.table('sendout_interviews', (table) => {
      // reverse alternations
      table.dropColumn('interview_range');
      table.dropColumn('interview_schedule');
    })
  }
}

module.exports = SendoutInterviewSchema
