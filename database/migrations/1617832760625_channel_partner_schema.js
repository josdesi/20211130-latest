'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class ChannelPartnerSchema extends Schema {
  up () {
    this.table('channel_partners', (table) => {
      // alter table
      table.integer('percent').defaultTo(5);
    })
  }

  down () {
    this.table('channel_partners', (table) => {
      // reverse alternations
      table.dropColumn('percent')
    })
  }
}

module.exports = ChannelPartnerSchema
