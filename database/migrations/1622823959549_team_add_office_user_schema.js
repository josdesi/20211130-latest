'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class TeamAddOfficeUserSchema extends Schema {
  up () {
    this.table('teams', (table) => {
      // alter table
      table.integer('office_user_id').references('id').inTable('users');
    })
  }

  down () {
    this.table('teams', (table) => {
      // reverse alternation
      table.dropColumn('office_user_id');
    })
  }
}

module.exports = TeamAddOfficeUserSchema
