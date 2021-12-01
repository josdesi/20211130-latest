'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class ChannelPartnerSchema extends Schema {
  up () {
    this.create('channel_partners', (table) => {
      table.increments()
      table
        .integer('referral_id')
        .unsigned()
        .references('id')
        .on('users')
      table
        .integer('referee_id')
        .unsigned()
        .references('id')
        .on('users')
      table.timestamps()
    })
  }

  down () {
    this.drop('channel_partners')
  }
}

module.exports = ChannelPartnerSchema
