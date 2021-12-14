'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class SendoutInterviewSchema extends Schema {
  up () {
    this.rename('interviews', 'sendout_interviews');
    this.table('sendout_interviews', (table) => {
      // alter table
      table
      .integer('sendout_interview_type_id')
      .unsigned()
      .references('id')
      .inTable('sendout_interview_types');
      table.dropColumn('interview_type_id');
    })
  }

  down () {
    this.rename('sendout_interviews', 'interviews');
    this.table('interviews', (table) => {
      // reverse alternations
      table
      .integer('interview_type_id')
      .unsigned()
      .references('id')
      .inTable('interview_types');
      table.dropColumn('sendout_interview_type_id');
    })
  }
}

module.exports = SendoutInterviewSchema
