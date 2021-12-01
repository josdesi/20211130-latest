'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class IncreaseInitialsSizeSchema extends Schema {
  up () {
    this.table('users', (table) => {
      // alter table
      table.string('initials',15).alter();
    })
  }

  down () {
    this.table('users', (table) => {
      // reverse alternations
      table.string('initials',5).alter();
    })
  }
}

module.exports = IncreaseInitialsSizeSchema
