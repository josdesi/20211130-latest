'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class NamesSchema extends Schema {
  up() {
    this.table('names', (table) => {
      table.unique('email');
      table.unique('link_profile');
    })
  }

  down() {
    this.table('names', (table) => {
      table.dropUnique('email');
      table.dropUnique('link_profile');
    })
  }
}

module.exports = NamesSchema
