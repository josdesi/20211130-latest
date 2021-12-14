'use strict'


/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class NamesSchema extends Schema {
  up () {
    this.table('names', (table) => {
      table.string('email', 255).nullable().alter();
      table.dropUnique('email');
    })
  }

  down () {
    this.table('names', (table) => {
      table.string('email', 255).notNullable().uniqueId().alter();
    })
  }
}

module.exports = NamesSchema
