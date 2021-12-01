'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');
const Database = use('Database');

class ModulePresetConfigSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      await Database.table('module_presets_configs')
        .transacting(transaction)
        .insert([
          {
            id: 'phoneMetricsEmail',
            data: {
              emailType: 'Test'
            },
          },
        ]);
    });
  }

  down () {}
}

module.exports = ModulePresetConfigSchema
