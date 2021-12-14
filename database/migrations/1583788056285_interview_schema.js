'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class InterviewSchema extends Schema {
  up() {
    this.create('interviews', table => {
      table.increments();

      table
        .integer('sendout_id')
        .unsigned()
        .references('id')
        .inTable('sendouts');

      table
        .integer('interview_type_id')
        .unsigned()
        .references('id')
        .inTable('interview_types');

      table.string('place', 254);
      table.datetime('interview_date').notNullable();

      table.timestamps();
      table.integer('created_by');
      table.integer('updated_by');
    });
  }

  down() {
    this.drop('interviews');
  }
}

module.exports = InterviewSchema;
