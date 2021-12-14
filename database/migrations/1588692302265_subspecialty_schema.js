'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class SubspecialtySchema extends Schema {
  up () {
    this.create('subspecialties', (table) => {
      table.increments();
      table
        .integer('specialty_id')
        .unsigned()
        .references('id')
        .inTable('specialties')
        .notNullable();
      table.text('title', 250).notNullable();
      table.timestamps();
      table.integer('created_by');
      table.integer('updated_by');
    })
  }

  down () {
    this.drop('subspecialties')
  }
}

module.exports = SubspecialtySchema
