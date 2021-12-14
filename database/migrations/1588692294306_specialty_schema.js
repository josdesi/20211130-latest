'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class SpecialtySchema extends Schema {
  up () {
    this.create('specialties', (table) => {
      table.increments();
      table
        .integer('industry_id')
        .unsigned()
        .references('id')
        .inTable('industries')
        .notNullable();
      table.text('title', 250).notNullable();
      table.timestamps();
      table.integer('created_by');
      table.integer('updated_by');
    })
  }

  down () {
    this.drop('specialties')
  }
}

module.exports = SpecialtySchema
