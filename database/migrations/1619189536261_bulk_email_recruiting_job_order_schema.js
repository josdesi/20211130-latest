'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class BulkEmailRecruitingJobOrderSchema extends Schema {
  up() {
    this.create('bulk_email_recruiting_job_orders', (table) => {
      table.increments();
      table.integer('job_order_id').unsigned().references('id').inTable('job_orders').notNullable().index();
      table.integer('email_history_id').unsigned().references('id').inTable('email_histories').notNullable().index();
      table.timestamps();
    });
  }

  down() {
    this.drop('bulk_email_recruiting_job_orders');
  }
}

module.exports = BulkEmailRecruitingJobOrderSchema;
