'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class SendoutAttachmentSchema extends Schema {
  up () {
    this.create('sendout_attachments', (table) => {
      table.increments();
      
      table
      .integer('sendout_id')
      .unsigned()
      .references('id')
      .inTable('sendouts');

      table
        .integer('file_type_id')
        .unsigned()
        .references('id')
        .inTable('file_types');
      
      table.text('url').notNullable();
      table.string('file_name',254)
      table.timestamps();
    });
  }

  down () {
    this.drop('sendout_attachments')
  }
}

module.exports = SendoutAttachmentSchema
