'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class GuaranteeSchema extends Schema {
  up() {
    this.create('guarantees', table => {
      table.increments();

      table
        .integer('sendout_id')
        .unsigned()
        .references('id')
        .inTable('sendouts');

      table.datetime('due_date').notNullable();
      table.specificType('status', 'smallint').notNullable();

      table.timestamps();
      table.integer('created_by');
      table.integer('updated_by');
    });
  }

  down() {
    this.drop('guarantees');
  }
}

module.exports = GuaranteeSchema;
