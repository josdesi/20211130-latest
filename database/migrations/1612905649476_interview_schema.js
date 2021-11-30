'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class InterviewSchema extends Schema {
  up () {
    this.table('interviews', (table) => {
      // alter table
      table.dropColumn('place');
      table.string('interview_time_zone', 254);
    })
  }

  down () {
    this.table('interviews', (table) => {
      // reverse alternations
      table.string('place', 254);
      table.dropColumn('interview_time_zone');
    })
  }
}

module.exports = InterviewSchema
