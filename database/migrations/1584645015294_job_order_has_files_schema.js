'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class JobOrderHasFilesSchema extends Schema {
  up () {
    this.create('job_order_has_files', (table) => {
      table.increments();
      table
        .integer('job_order_id')
        .unsigned()
        .references('id')
        .inTable('job_orders');
      table
        .integer('file_type_id')
        .unsigned()
        .references('id')
        .inTable('file_types');
      table.text('url').notNullable();
      table.string('file_name',254)
      table.timestamps();
    })
  }

  down () {
    this.drop('job_order_has_files')
  }
}

module.exports = JobOrderHasFilesSchema
