'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class JobOrderSchema extends Schema {
  up() {
    this.create('job_orders', table => {
      table.increments();
      table
        .integer('recruiter_id')
        .unsigned()
        .references('id')
        .inTable('users');
      table
        .integer('hiring_authority_id')
        .unsigned()
        .references('id')
        .inTable('hiring_authorities');
      table
        .integer('company_id')
        .unsigned()
        .references('id')
        .inTable('companies');
      table
        .integer('industry_id')
        .unsigned()
        .references('id')
        .inTable('industries');
      table
        .integer('position_id')
        .unsigned()
        .references('id')
        .inTable('positions');
      table
        .integer('address_id')
        .unsigned()
        .references('id')
        .inTable('addresses');
      table
        .integer('status_id')
        .unsigned()
        .references('id')
        .inTable('job_order_statuses');
      table
        .integer('sub_status_id')
        .unsigned()
        .references('id')
        .inTable('sendout_statuses');
      table.string('title', 254).notNullable();
      table.date('start_date');
      table.string('source', 254);
      table.date('open_since');
      table.specificType('hot_item', 'smallint');
      table.date('hot_item_date');
      table.specificType('different_location', 'smallint');
      table.timestamps();
      table.integer('created_by');
      table.integer('updated_by');
    });
  }

  down() {
    this.drop('job_orders');
  }
}

module.exports = JobOrderSchema;
