'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class EmailOptOutSchema extends Schema {
  up() {
    this.create('email_opt_outs', (table) => {
      table.increments();
      table.integer('created_by').unsigned().references('id').inTable('users');
      table.integer('item_id').unsigned();
      table.integer('email_opt_out_type_id').unsigned().references('id').inTable('email_opt_out_types');
      table.timestamps();
    });
  }

  down() {
    this.drop('email_opt_outs');
  }
}

module.exports = EmailOptOutSchema;
