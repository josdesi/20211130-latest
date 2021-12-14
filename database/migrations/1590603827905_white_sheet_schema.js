'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class WhiteSheetSchema extends Schema {
  up () {
    this
      .raw(`UPDATE white_sheets SET time_position_open = created_at WHERE time_position_open is NULL `)
      .raw(`UPDATE white_sheets SET  position_filled = created_at + '1 month'::interval WHERE position_filled is NULL`)
      .raw(`UPDATE white_sheets SET  preset_interview_dates ='[]' WHERE preset_interview_dates is NULL`)
      .raw(`UPDATE white_sheets SET  notes = ' ' WHERE notes is NULL`)
      .raw(`UPDATE white_sheets SET  benefits =' ' WHERE benefits is NULL`)
      .table('white_sheets', (table) => {
        // alter table
        table.dropColumn('relocation_assistance');
        table.dropColumn('fee_agreement_type_id');
        table.date('time_position_open').notNullable().alter();
        table.string('position_filled',50).notNullable().alter();
        table.json('preset_interview_dates').notNullable().alter();
        table.text('notes').notNullable().alter(); 
        table.string('benefits', 254).notNullable().alter();
    })
  }

  down () {
    this.table('white_sheets', (table) => {
      // reverse alternations
      table
        .integer('fee_agreement_type_id')
        .unsigned()
        .references('id')
        .inTable('fee_agreement_types');
      table.specificType('relocation_assistance', 'smallint');
      table.date('time_position_open').nullable().alter();
      table.string('position_filled',50).nullable().alter();
      table.json('preset_interview_dates').nullable().alter();
      table.text('notes').nullable().alter();
      table.string('benefits', 254).nullable().alter();
      
    })
  }
}

module.exports = WhiteSheetSchema
