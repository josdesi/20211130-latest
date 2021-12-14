'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class JobOrderAdditionalRecruiterSchema extends Schema {
  up () {
    this.create('job_order_additional_recruiters', (table) => {
      table.increments()
      table.integer('job_order_id')
        .notNullable()
        .references('id')
        .inTable('job_orders');
      table.integer('recruiter_id')
        .notNullable()
        .references('id')
        .inTable('users');
      table.string('status');
      table.string('type');
      table.text('notes');
      table.integer('recruiter_to_collaborate_id')
        .references('id')
        .inTable('users');
      table.integer('created_by')
        .notNullable()
        .references('id')
        .inTable('users');
      table.integer('updated_by')
        .notNullable()
        .references('id')
        .inTable('users');
      table.text('decline_reason');
      table.timestamps()
    })
  }

  down () {
    this.drop('job_order_additional_recruiters')
  }
}

module.exports = JobOrderAdditionalRecruiterSchema
