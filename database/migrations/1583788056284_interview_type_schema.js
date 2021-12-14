'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class InterviewTypeSchema extends Schema {
  up() {
    this.create('interview_types', table => {
      table.increments();

      table
        .string('title', 50)
        .notNullable()
        .unique();
      table.timestamps();
      table.integer('created_by');
      table.integer('updated_by');
    });
  }

  down() {
    this.drop('interview_types');
  }
}

module.exports = InterviewTypeSchema;
