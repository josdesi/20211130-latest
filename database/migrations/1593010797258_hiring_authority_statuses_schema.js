'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class HiringAuthorityStatusesSchema extends Schema {
  up () {
    this.create('hiring_authority_statuses', (table) => {
      table.integer('id').primary();
      table.string('title', 50).notNullable();
      table.timestamps();
    })
  }

  down () {
    this.drop('hiring_authority_statuses')
  }
}

module.exports = HiringAuthorityStatusesSchema
