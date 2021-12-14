'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class ChangeSendoutTypeAmountSchema extends Schema {
  up () {
    this.table('sendouts', (table) => {
      // alter table
      table.float('fee_amount').alter()
    })
  }

  down () {
    this.table('sendouts', (table) => {
      // reverse alternations
      table.integer('fee_amount').alter()
    })
  }
}

module.exports = ChangeSendoutTypeAmountSchema
