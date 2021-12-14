'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class SendoutCurrentGoalsSchema extends Schema {
  up () {
    this.create('sendout_current_goals', (table) => {
      table.increments()
      table.integer('recruiter_id').unsigned().references('id').inTable('users');
      table.integer('goal');
      table.timestamps()
    })
  }

  down () {
    this.drop('sendout_current_goals')
  }
}

module.exports = SendoutCurrentGoalsSchema
