'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class JobOrderSourceTypeSchema extends Schema {
  up () {
    this.create('job_order_source_types', (table) => {
      table.increments();
      table
        .string('title', 25)
        .notNullable()
        .unique();
      table.integer('created_by').references('id').inTable('users');
      table.integer('updated_by').references('id').inTable('users');
      table.timestamps();
    })
  }

  down () {
    this.drop('job_order_source_types')
  }
  
}

module.exports = JobOrderSourceTypeSchema
