'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class HiringAuthoritiesSchema extends Schema {
  up () {
    this.table('hiring_authorities', (table) => {
      table.integer('specialty_id')
        .references('id')
        .inTable('specialties');
      table.integer('subspecialty_id')
        .references('id')
        .inTable('subspecialties');
      table.integer('position_id')
        .references('id')
        .inTable('positions');
      table.string('other_ext', 16);
    })
  }

  down () {
    this.table('hiring_authorities', (table) => {
      table.dropColumn('specialty_id');
      table.dropColumn('subspecialty_id');
      table.dropColumn('position_id');
      table.dropColumn('other_ext');
    })
  }
}

module.exports = HiringAuthoritiesSchema
