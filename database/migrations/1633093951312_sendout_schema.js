'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database');

class SendoutSchema extends Schema {
  up () {
    this.table('sendouts', (table) => {
      // alter table
      table.boolean('deleted').defaultTo(false);
    })
  }

  down () {
    this.table('sendouts', (table) => {
      // reverse alternations
      table.dropColumn('deleted');
    })
  }
}

module.exports = SendoutSchema
