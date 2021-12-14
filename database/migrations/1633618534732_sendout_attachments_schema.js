'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class SendoutAttachmentsSchema extends Schema {
  up () {
    this.table('sendout_attachments', (table) => {
      table.integer('size').unsigned();
    })
  }

  down () {
    this.table('sendout_attachments', (table) => {
      table.dropColumn('size');
    })
  }
}

module.exports = SendoutAttachmentsSchema
