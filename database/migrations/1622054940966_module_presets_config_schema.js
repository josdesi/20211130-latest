'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');
const Config = use('Adonis/Src/Config');
const Database = use('Database');

class ModulePresetsConfigSchema extends Schema {
  up() {
    this.schedule(async (transaction) => {
      await Database.table('module_presets_configs')
        .transacting(transaction)
        .insert([
          {
            id: Config.get('modulePresetConfig.similarityThreshold.key'),
            data: Config.get('modulePresetConfig.similarityThreshold.data'),
          },
        ]);
    });
  }

  down() {}
}

module.exports = ModulePresetsConfigSchema;
