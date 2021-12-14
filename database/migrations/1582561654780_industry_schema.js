'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class IndustrySchema extends Schema {
  up() {
    this.create('industries', table => {
      table.increments();
      table.text('title', 250).notNullable();
      table.timestamps();
      table.integer('created_by');
      table.integer('updated_by');
    });
  }

  down() {
    this.drop('industries');
  }
}

module.exports = IndustrySchema;
