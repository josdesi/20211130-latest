'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class SendoutInterviewTypeSchema extends Schema {
  up () {
    this.rename('interview_types', 'sendout_interview_types');
  }

  down () {
    this.rename('sendout_interview_types', 'interview_types');
  }
}

module.exports = SendoutInterviewTypeSchema
