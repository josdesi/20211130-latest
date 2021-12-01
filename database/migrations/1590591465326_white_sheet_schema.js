'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const { jobOrderType } = use('App/Helpers/Globals');

class WhiteSheetSchema extends Schema {
  up () {
    this.raw(`UPDATE white_sheets SET job_order_type_id = ${jobOrderType.CANT_TELL} WHERE job_order_type_id is NULL`)
    this.table('white_sheets', (table) => {
      // alter table
      table
        .integer('job_order_type_id')
        .notNullable()
        .defaultTo(jobOrderType.CANT_TELL)
        .alter();
    })
  }

  down () {
    this.table('white_sheets', (table) => {
      // reverse alternations
      table
        .integer('job_order_type_id')
        .nullable()
        .alter();
    })
  }
}

module.exports = WhiteSheetSchema
