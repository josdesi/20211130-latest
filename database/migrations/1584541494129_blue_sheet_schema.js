'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class BlueSheetSchema extends Schema {
  up() {
    this.create('blue_sheets', table => {
      table.increments();
      table
        .integer('candidate_id')
        .unsigned()
        .references('id')
        .inTable('candidates');
      table.text('reason_leaving').notNullable();
      table.specificType('relocation', 'smallint').notNullable();
      table.string('achievement_one', 254).notNullable();
      table.string('achievement_two', 254);
      table.string('achievement_three', 254);
      table.text('experience').notNullable();
      table.string('time_looking', 30).notNullable();
      table.string('time_to_start', 30).notNullable();
      table.integer('minimum_salary').notNullable();
      table.integer('good_salary').notNullable();
      table.integer('no_brainer_salary').notNullable();
      table.specificType('make_a_change', 'smallint').notNullable();
      table.text('interview_dates');
      table.timestamps();
    });
  }

  down() {
    this.drop('blue_sheets');
  }
}

module.exports = BlueSheetSchema;
