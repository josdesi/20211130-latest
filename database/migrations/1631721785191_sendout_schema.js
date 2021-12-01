'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database')

class SendoutSchema extends Schema {
  up () {
    this.table('sendouts', (table) => {
      table.datetime('board_date');
    })
  }

  down () {
    this.table('sendouts', (table) => {
      table.dropColumn('board_date');
    })
  }
}

module.exports = SendoutSchema
