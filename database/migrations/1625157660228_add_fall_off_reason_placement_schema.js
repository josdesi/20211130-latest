'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class AddFallOffReasonPlacementSchema extends Schema {
  up() {
    this.table('placements', (table) => {
      // alter table
      table
        .integer('placement_fall_off_reason_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('placement_fall_off_reasons');
      table.string('fall_off_reason');
      table.boolean('candidate_still_available');
      table.boolean('job_still_open');
      table.datetime('fall_off_date');
      table.text('notes');
      table.integer('previous_status_id')
        .references('id')
        .inTable('placement_statuses');
    });
  }

  down() {
    this.table('placements', (table) => {
      // reverse alternations
      table.dropColumn('placement_fall_off_reason_id');
      table.dropColumn('fall_off_reason');
      table.dropColumn('candidate_still_available');
      table.dropColumn('job_still_open');
      table.dropColumn('fall_off_date');
      table.dropColumn('previous_status_id');
      table.dropColumn('notes');
    });
  }
}

module.exports = AddFallOffReasonPlacementSchema;
