'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
class NameEntityTypesSchema extends Schema {
  up () {
    this.create('name_entity_types', (table) => {
      table.integer('id').primary();
      table.integer('name_type_id').references('id').inTable('name_types');
      table.integer('original_table_id');
      table.timestamps()
    });
  }

  down () {
    this.drop('name_entity_types')
  }
}

module.exports = NameEntityTypesSchema
