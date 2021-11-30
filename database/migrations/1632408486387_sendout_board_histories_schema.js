'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class SendoutBoardHistoriesSchema extends Schema {
  up () {
    this.create('sendout_board_histories', (table) => {
      table.increments()
      table.integer('recruiter_id').unsigned().references('id').inTable('users');
      table.integer('daily');
      table.integer('m');
      table.integer('t');
      table.integer('w');
      table.integer('th');
      table.integer('f');
      table.integer('goal');
      table.integer('total');
      table.integer('adjusted');
      table.timestamp('cutoff_date');
      table.timestamps()
    })
  }

  down () {
    this.drop('sendout_board_histories')
  }
}

module.exports = SendoutBoardHistoriesSchema
