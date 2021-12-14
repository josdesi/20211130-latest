'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class ModulePresetsConfigsSchema extends Schema {
  up () {
    this.create('module_presets_configs', (table) => {
      table.string('id', 255).primary();
      table.jsonb('data');
      table.timestamps()
    })
  }

  down () {
    this.drop('module_presets_configs')
  }
}

module.exports = ModulePresetsConfigsSchema
